/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;
const USERS_TABLE = process.env.USERS_TABLE;
const ENC_KEY = process.env.FANTASY_ENC_KEY;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
  // Live scores must never be served from a cache — belt-and-suspenders
  // alongside the frontend's own cache: "no-store" fetch.
  "Cache-Control": "no-store",
};

// Player cache is refreshed at most once every 20h (the full Sleeper player
// list is ~5MB and only meaningfully changes day to day).
const SLEEPER_PLAYER_CACHE_TTL_MS = 20 * 60 * 60 * 1000;

// --- ESPN's undocumented lineup slot / pro team id maps (stable for years,
// sourced from the widely-used cwendt94/espn-api reference implementation) ---
const ESPN_POSITION_MAP = {
  0: "QB",
  1: "TQB",
  2: "RB",
  3: "RB/WR",
  4: "WR",
  5: "WR/TE",
  6: "TE",
  7: "OP",
  8: "DT",
  9: "DE",
  10: "LB",
  11: "DL",
  12: "CB",
  13: "S",
  14: "DB",
  15: "DP",
  16: "D/ST",
  17: "K",
  18: "P",
  19: "HC",
  20: "BE",
  21: "IR",
  23: "FLEX",
  24: "ER",
  25: "Rookie",
};
const ESPN_BENCH_SLOTS = [20, 21];

const ESPN_PRO_TEAM_MAP = {
  0: "FA",
  1: "ATL",
  2: "BUF",
  3: "CHI",
  4: "CIN",
  5: "CLE",
  6: "DAL",
  7: "DEN",
  8: "DET",
  9: "GB",
  10: "TEN",
  11: "IND",
  12: "KC",
  13: "LV",
  14: "LAR",
  15: "MIA",
  16: "MIN",
  17: "NE",
  18: "NO",
  19: "NYG",
  20: "NYJ",
  21: "PHI",
  22: "ARI",
  23: "PIT",
  24: "LAC",
  25: "SF",
  26: "SEA",
  27: "TB",
  28: "WSH",
  29: "CAR",
  30: "JAX",
  33: "BAL",
  34: "HOU",
};

// Different sources spell a couple of team codes differently; normalize
// everything to the abbreviation the public NFL scoreboard uses.
const TEAM_ALIASES = { WAS: "WSH", JAC: "JAX" };
const normTeam = (abbr) => TEAM_ALIASES[abbr] || abbr;

// ---------------------------------------------------------------------------
// ESPN cookie encryption (espn_s2 / SWID are effectively a login session for
// a private league — never stored in plaintext, never echoed back to the UI)
// ---------------------------------------------------------------------------
function getEncKey() {
  const key = Buffer.from(ENC_KEY || "", "hex");
  if (key.length !== 32) {
    throw new Error(
      `FANTASY_ENC_KEY must be a 64-character hex string (32 bytes); got ${key.length} bytes. Regenerate with 'openssl rand -hex 32'.`,
    );
  }
  return key;
}

function encryptCookies(cookieObj) {
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(JSON.stringify(cookieObj), "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptCookies(ciphertext, iv, tag) {
  const key = getEncKey();
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final(),
    ]);
    return JSON.parse(dec.toString("utf8"));
  } catch {
    throw new Error(
      "Saved ESPN cookies could not be decrypted — FANTASY_ENC_KEY likely changed since this league was linked. Unlink and re-link it.",
    );
  }
}

function maskLeague(item) {
  // eslint-disable-next-line no-unused-vars
  const { espnCookieCipher, espnCookieIv, espnCookieTag, ...rest } = item;
  return { ...rest, hasCookies: !!espnCookieCipher };
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const snippet = bodyText ? `: ${bodyText.slice(0, 200)}` : "";
    throw new Error(`${url} → HTTP ${res.status}${snippet}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Sleeper's full player list (~5MB) is cached in DynamoDB, trimmed down to
// just the fantasy-relevant fields, and refreshed at most once a day.
// ---------------------------------------------------------------------------
async function getSleeperPlayerCache() {
  const cacheRes = await dynamo.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: "CACHE#SLEEPER_PLAYERS", sk: "META" },
    }),
  );
  const cached = cacheRes.Item;
  const isFresh =
    cached &&
    Date.now() - new Date(cached.fetchedAt).getTime() <
      SLEEPER_PLAYER_CACHE_TTL_MS;
  if (isFresh) return cached.players;

  const all = await fetchJson("https://api.sleeper.app/v1/players/nfl");
  const trimmed = {};
  for (const [id, p] of Object.entries(all)) {
    if (!p || !p.team || !p.position) continue;
    if (!["QB", "RB", "WR", "TE", "K", "DEF"].includes(p.position)) continue;
    trimmed[id] = {
      name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      team: p.team,
      pos: p.position,
    };
  }

  // Best-effort de-dup: if a concurrent request already refreshed the cache
  // while we were downloading, don't clobber their equally-fresh write —
  // this doesn't avoid the duplicate ~5MB fetch itself, but it does stop
  // two concurrent refreshes from fighting over the write.
  const recheck = await dynamo.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: "CACHE#SLEEPER_PLAYERS", sk: "META" },
    }),
  );
  if (
    recheck.Item &&
    Date.now() - new Date(recheck.Item.fetchedAt).getTime() <
      SLEEPER_PLAYER_CACHE_TTL_MS
  ) {
    return recheck.Item.players;
  }

  const item = {
    pk: "CACHE#SLEEPER_PLAYERS",
    sk: "META",
    fetchedAt: new Date().toISOString(),
    players: trimmed,
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return trimmed;
}

function resolveSleeperPlayer(playerId, playerCache) {
  const p = playerCache[playerId];
  if (p) return p;
  // Team defenses are keyed by team abbreviation instead of a numeric id.
  if (/^[A-Z]{2,4}$/.test(playerId)) {
    return { name: `${playerId} D/ST`, team: playerId, pos: "DEF" };
  }
  return null;
}

function espnTeamName(team) {
  if (team?.name && team.name !== "Unknown") return team.name;
  return `${team?.location || "Unknown"} ${team?.nickname || "Unknown"}`.trim();
}

function recordStr(wins, losses, ties) {
  const w = wins || 0;
  const l = losses || 0;
  const t = ties || 0;
  return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
}

const round1 = (n) => Math.round(n * 10) / 10;

// Builds the "what do I actually need to win this matchup" projection —
// which of each side's starters still have a game left to change their
// score, and what the current lead/deficit against them works out to.
// A player counts as "remaining" if their NFL team is playing this week and
// that game isn't final yet (in-progress counts the same as not-yet-started,
// same convention the big fantasy platforms use for these "magic number"
// widgets).
function buildProjection(
  myScore,
  oppScore,
  myStarters,
  oppStarters,
  teamsPlayingThisWeek,
  gameStateByTeam,
) {
  const isRemaining = (p) =>
    teamsPlayingThisWeek.has(p.team) && !gameStateByTeam[p.team]?.completed;

  const myRemaining = myStarters.filter(isRemaining);
  const oppRemaining = oppStarters.filter(isRemaining);
  const my = Number(myScore) || 0;
  const opp = Number(oppScore) || 0;
  // More than 3 names gets unwieldy on a small card — name them individually
  // only when there's a short, glanceable list; otherwise just say whose
  // players they are.
  const describePlayers = (list, whoseLabel) =>
    list.length <= 3 ? list.map((p) => p.name).join(", ") : whoseLabel;

  const nobodyStarted =
    my === 0 &&
    opp === 0 &&
    myRemaining.length === myStarters.length &&
    oppRemaining.length === oppStarters.length;

  if (myStarters.length + oppStarters.length > 0 && nobodyStarted) {
    return { cls: "", text: "The games haven't started yet." };
  }

  const myDone = myRemaining.length === 0;
  const oppDone = oppRemaining.length === 0;

  // Both sides locked in — the matchup is decided.
  if (myDone && oppDone) {
    if (my === opp)
      return { cls: "tied", text: `Tied, ${my.toFixed(1)}–${opp.toFixed(1)}.` };
    return my > opp
      ? { cls: "won", text: `✅ You won, ${my.toFixed(1)}–${opp.toFixed(1)}.` }
      : { cls: "lost", text: `❌ You lost, ${opp.toFixed(1)}–${my.toFixed(1)}.` };
  }

  // Opponent's locked in but you still have players — an exact target.
  if (oppDone) {
    if (my > opp)
      return {
        cls: "won",
        text: "✅ You've already won — your opponent has nobody left to play.",
      };
    if (my < opp)
      return {
        cls: "lost",
        text: `You need ${describePlayers(myRemaining, "the rest of your players")} to combine for ${round1(opp - my)}+ points to win.`,
      };
    return {
      cls: "tied",
      text: `Tied — any points from ${describePlayers(myRemaining, "the rest of your players")} win it for you.`,
    };
  }

  // You're locked in but your opponent still has players — an exact target.
  if (myDone) {
    if (my > opp)
      return {
        cls: "won",
        text: `You need ${describePlayers(oppRemaining, "the rest of your opponent's players")} to score ${round1(my - opp)} or fewer combined points for you to hold the win.`,
      };
    if (my < opp)
      return {
        cls: "lost",
        text: "❌ You've locked in a loss — your players are done and you're behind.",
      };
    return {
      cls: "tied",
      text: `Tied — you'll lose if ${describePlayers(oppRemaining, "the rest of your opponent's players")} score anything more.`,
    };
  }

  // Both sides still have players in play — the standard "magic number"
  // framing, measured against the current (not final) opposing score.
  if (my > opp)
    return {
      cls: "won",
      text: `You're up by ${round1(my - opp)}. You need ${describePlayers(oppRemaining, "the rest of your opponent's players")} to combine for ${round1(my - opp)} or fewer points to hold the win.`,
    };
  if (my < opp)
    return {
      cls: "lost",
      text: `You need ${describePlayers(myRemaining, "the rest of your players")} to combine for ${round1(opp - my)}+ points to take the lead.`,
    };
  return {
    cls: "tied",
    text:
      myRemaining.length + oppRemaining.length <= 3
        ? `Tied at ${my.toFixed(1)}. ${describePlayers([...myRemaining, ...oppRemaining], "several players")} still to play.`
        : `Tied at ${my.toFixed(1)}, with players still to play on both sides.`,
  };
}

function resolveEspnPlayer(entry, week) {
  if (ESPN_BENCH_SLOTS.includes(entry.lineupSlotId)) return null;
  const player = entry.playerPoolEntry?.player || entry.player;
  if (!player) return null;
  const weekStats = (player.stats || []).find(
    (s) => s.scoringPeriodId === week && s.statSourceId === 0,
  );
  return {
    name: player.fullName,
    team: ESPN_PRO_TEAM_MAP[player.proTeamId] || "FA",
    pos: ESPN_POSITION_MAP[entry.lineupSlotId] || "",
    points: weekStats ? Math.round(weekStats.appliedTotal * 10) / 10 : null,
  };
}

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  try {
    if (!USERS_TABLE) {
      console.error("USERS_TABLE environment variable is missing!");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Server misconfiguration: USERS_TABLE missing.",
        }),
      };
    }

    const profileRes = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { pk: `USER#${userId}` } }),
    );
    const profile = profileRes.Item || {};
    const isAdmin = profile.role === "ADMIN";
    const hasFantasy = isAdmin || profile.permissions?.fantasy === true;

    if (!hasFantasy) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Fantasy access required" }),
      };
    }

    await dynamo
      .send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { pk: `USER#${userId}` },
          UpdateExpression: "SET lastUsedFantasy = :now",
          ExpressionAttributeValues: { ":now": new Date().toISOString() },
        }),
      )
      .catch((err) => console.error("Failed to record fantasy usage:", err));

    const USER_PK = `USER#${userId}`;

    // -----------------------------------------------------------------
    // GET /fantasy/leagues — the caller's own linked leagues (masked)
    // -----------------------------------------------------------------
    if (method === "GET" && path === "/fantasy/leagues") {
      const data = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
          ExpressionAttributeValues: { ":pk": USER_PK, ":prefix": "LEAGUE#" },
        }),
      );
      const leagues = (data.Items || []).map(maskLeague);
      return { statusCode: 200, headers, body: JSON.stringify(leagues) };
    }

    // -----------------------------------------------------------------
    // POST /fantasy/leagues — link a Sleeper or ESPN league
    // -----------------------------------------------------------------
    if (method === "POST" && path === "/fantasy/leagues") {
      const body = JSON.parse(event.body);
      const { platform, leagueId, nickname } = body;

      if (!platform || !leagueId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "platform and leagueId required" }),
        };
      }

      if (platform === "SLEEPER") {
        const { sleeperUsername } = body;
        if (!sleeperUsername) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "sleeperUsername required" }),
          };
        }

        let sleeperUsers;
        try {
          sleeperUsers = await fetchJson(
            `https://api.sleeper.app/v1/league/${leagueId}/users`,
          );
        } catch {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error:
                "Could not find that Sleeper league. Double check the League ID.",
            }),
          };
        }

        const match = sleeperUsers.find(
          (u) =>
            u.display_name?.toLowerCase() === sleeperUsername.toLowerCase(),
        );
        if (!match) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error:
                "Couldn't find that username in this league. Double check the League ID and username.",
            }),
          };
        }

        const item = {
          pk: USER_PK,
          sk: `LEAGUE#SLEEPER#${leagueId}`,
          platform: "SLEEPER",
          leagueId: String(leagueId),
          nickname: nickname || null,
          sleeperUsername,
          sleeperUserId: match.user_id,
          linkedAt: new Date().toISOString(),
        };
        await dynamo.send(
          new PutCommand({ TableName: TABLE_NAME, Item: item }),
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(maskLeague(item)),
        };
      }

      if (platform === "ESPN") {
        const { espnTeamId, espnCookies, season } = body;
        if (!espnTeamId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "espnTeamId required" }),
          };
        }

        const sk = `LEAGUE#ESPN#${leagueId}`;
        let cookieFields = {};

        if (espnCookies?.espn_s2 && espnCookies?.swid) {
          if (!ENC_KEY) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({
                error: "Server misconfiguration: FANTASY_ENC_KEY missing.",
              }),
            };
          }
          const enc = encryptCookies({
            espn_s2: espnCookies.espn_s2,
            swid: espnCookies.swid,
          });
          cookieFields = {
            espnCookieCipher: enc.ciphertext,
            espnCookieIv: enc.iv,
            espnCookieTag: enc.tag,
          };
        } else {
          // Preserve previously-saved cookies if this is just an update
          // that didn't re-paste them.
          const existing = await dynamo.send(
            new GetCommand({ TableName: TABLE_NAME, Key: { pk: USER_PK, sk } }),
          );
          if (existing.Item?.espnCookieCipher) {
            cookieFields = {
              espnCookieCipher: existing.Item.espnCookieCipher,
              espnCookieIv: existing.Item.espnCookieIv,
              espnCookieTag: existing.Item.espnCookieTag,
            };
          }
        }

        const item = {
          pk: USER_PK,
          sk,
          platform: "ESPN",
          leagueId: String(leagueId),
          nickname: nickname || null,
          season: String(season || new Date().getFullYear()),
          espnTeamId: String(espnTeamId),
          ...cookieFields,
          linkedAt: new Date().toISOString(),
        };
        await dynamo.send(
          new PutCommand({ TableName: TABLE_NAME, Item: item }),
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(maskLeague(item)),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Unknown platform" }),
      };
    }

    // -----------------------------------------------------------------
    // DELETE /fantasy/leagues/{id} — unlink a league
    // -----------------------------------------------------------------
    if (method === "DELETE" && path.startsWith("/fantasy/leagues/")) {
      const sk = decodeURIComponent(event.pathParameters.id);
      await dynamo.send(
        new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: USER_PK, sk } }),
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" }),
      };
    }

    // -----------------------------------------------------------------
    // GET /fantasy/guide — this week's watch-along cross-reference
    // -----------------------------------------------------------------
    if (method === "GET" && path === "/fantasy/guide") {
      const data = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
          ExpressionAttributeValues: { ":pk": USER_PK, ":prefix": "LEAGUE#" },
        }),
      );
      const leagues = data.Items || [];

      if (leagues.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ week: null, games: [], leaguesLinked: 0 }),
        };
      }

      const sleeperState = await fetchJson(
        "https://api.sleeper.app/v1/state/nfl",
      );
      const week =
        Number(event.queryStringParameters?.week) || sleeperState.week || 1;
      const season = event.queryStringParameters?.season || sleeperState.season;

      const rootForByTeam = {};
      const rootAgainstByTeam = {};
      const leagueErrors = [];
      const matchups = [];

      const needsSleeperPlayers = leagues.some((l) => l.platform === "SLEEPER");
      let sleeperPlayers = null;
      if (needsSleeperPlayers) {
        try {
          sleeperPlayers = await getSleeperPlayerCache();
        } catch (cacheErr) {
          // Don't let a cache refresh failure (throttling, transient AWS
          // error, etc.) take down the whole guide — degrade to unresolved
          // Sleeper players instead of 500ing every linked league.
          console.error("Failed to refresh Sleeper player cache:", cacheErr);
          leagueErrors.push({
            league: "Sleeper",
            message:
              "Couldn't refresh Sleeper player data — try again shortly.",
          });
          sleeperPlayers = {};
        }
      }

      // Same player rostered across multiple leagues gets merged into one
      // entry, with its leagues/points kept as parallel arrays, instead of
      // showing up as a separate row per league.
      const pushEntry = (map, team, entry) => {
        const t = normTeam(team);
        if (!t || t === "FA") return;
        if (!map[t]) map[t] = [];
        const existing = map[t].find((e) => e.name === entry.name);
        if (existing) {
          if (!existing.leagues.includes(entry.league)) {
            existing.leagues.push(entry.league);
            existing.points.push(entry.points ?? null);
          }
          return;
        }
        map[t].push({
          name: entry.name,
          pos: entry.pos,
          team: t,
          leagues: [entry.league],
          points: [entry.points ?? null],
        });
      };

      const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2${season ? `&dates=${season}` : ""}`;

      const [scoreboard] = await Promise.all([
        fetchJson(scoreboardUrl),
        Promise.all(
          leagues.map(async (league) => {
            const label =
              league.nickname ||
              `${league.platform === "SLEEPER" ? "Sleeper" : "ESPN"} League ${String(league.leagueId).slice(-4)}`;

            try {
              if (league.platform === "SLEEPER") {
                const [rosters, matchupsData, users] = await Promise.all([
                  fetchJson(
                    `https://api.sleeper.app/v1/league/${league.leagueId}/rosters`,
                  ),
                  fetchJson(
                    `https://api.sleeper.app/v1/league/${league.leagueId}/matchups/${week}`,
                  ),
                  fetchJson(
                    `https://api.sleeper.app/v1/league/${league.leagueId}/users`,
                  ),
                ]);
                const teamName = (ownerId) => {
                  const u = users.find((x) => x.user_id === ownerId);
                  return (
                    u?.metadata?.team_name || u?.display_name || "Unknown Team"
                  );
                };

                const myRoster = rosters.find(
                  (r) => r.owner_id === league.sleeperUserId,
                );
                if (!myRoster) {
                  leagueErrors.push({
                    league: label,
                    message:
                      "Couldn't find your roster in this league — the linked Sleeper username may no longer match.",
                  });
                  return;
                }
                const myMatchup = matchupsData.find(
                  (m) => m.roster_id === myRoster.roster_id,
                );
                if (!myMatchup) {
                  // Not an error — the league just hasn't generated matchups
                  // yet (still drafting, preseason, etc). Show a card that
                  // says so instead of vanishing with no explanation.
                  matchups.push({
                    league: label,
                    platform: "SLEEPER",
                    leagueId: league.leagueId,
                    myTeamName: teamName(league.sleeperUserId),
                    bye: true,
                    noMatchupYet: true,
                  });
                  return;
                }
                const oppMatchup = matchupsData.find(
                  (m) =>
                    m.matchup_id === myMatchup.matchup_id &&
                    m.roster_id !== myRoster.roster_id,
                );
                const oppRoster = oppMatchup
                  ? rosters.find((r) => r.roster_id === oppMatchup.roster_id)
                  : null;

                const myStartersResolved = (myMatchup.starters || [])
                  .filter((id) => id && id !== "0")
                  .map((pid) => {
                    const p = resolveSleeperPlayer(pid, sleeperPlayers);
                    if (!p) return null;
                    return {
                      name: p.name,
                      pos: p.pos,
                      team: normTeam(p.team),
                      points: myMatchup.players_points?.[pid] ?? 0,
                    };
                  })
                  .filter(Boolean);

                const oppStartersResolved = (oppMatchup?.starters || [])
                  .filter((id) => id && id !== "0")
                  .map((pid) => {
                    const p = resolveSleeperPlayer(pid, sleeperPlayers);
                    if (!p) return null;
                    return {
                      name: p.name,
                      pos: p.pos,
                      team: normTeam(p.team),
                      points: oppMatchup.players_points?.[pid] ?? 0,
                    };
                  })
                  .filter(Boolean);

                matchups.push({
                  league: label,
                  platform: "SLEEPER",
                  leagueId: league.leagueId,
                  myTeamName: teamName(league.sleeperUserId),
                  myScore: myMatchup.points ?? 0,
                  myRecord: recordStr(
                    myRoster.settings?.wins,
                    myRoster.settings?.losses,
                    myRoster.settings?.ties,
                  ),
                  oppTeamName: oppRoster ? teamName(oppRoster.owner_id) : null,
                  oppScore: oppMatchup ? (oppMatchup.points ?? 0) : null,
                  oppRecord: oppRoster
                    ? recordStr(
                        oppRoster.settings?.wins,
                        oppRoster.settings?.losses,
                        oppRoster.settings?.ties,
                      )
                    : null,
                  bye: !oppMatchup,
                  // Used to build the "who's left to play" projection once
                  // the scoreboard is in — stripped before the response goes out.
                  myStarters: myStartersResolved,
                  oppStarters: oppStartersResolved,
                });

                myStartersResolved.forEach((p) =>
                  pushEntry(rootForByTeam, p.team, {
                    name: p.name,
                    pos: p.pos,
                    league: label,
                    points: p.points,
                  }),
                );
                oppStartersResolved.forEach((p) =>
                  pushEntry(rootAgainstByTeam, p.team, {
                    name: p.name,
                    pos: p.pos,
                    league: label,
                    points: p.points,
                  }),
                );
              }

              if (league.platform === "ESPN") {
                let cookieHeader;
                if (league.espnCookieCipher) {
                  const { espn_s2, swid } = decryptCookies(
                    league.espnCookieCipher,
                    league.espnCookieIv,
                    league.espnCookieTag,
                  );
                  cookieHeader = `espn_s2=${espn_s2}; SWID=${swid}`;
                }

                const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${league.season}/segments/0/leagues/${league.leagueId}?view=mTeam&view=mRoster&view=mMatchup&view=mSettings`;
                const leagueData = await fetchJson(
                  url,
                  cookieHeader
                    ? { headers: { Cookie: cookieHeader } }
                    : undefined,
                );

                const espnWeek = week;
                const myTeam = (leagueData.teams || []).find(
                  (t) => String(t.id) === String(league.espnTeamId),
                );
                if (!myTeam) {
                  leagueErrors.push({
                    league: label,
                    message:
                      "Couldn't find your team in this league — double check the linked ESPN team ID.",
                  });
                  return;
                }

                const matchup = (leagueData.schedule || []).find(
                  (m) =>
                    m.matchupPeriodId === espnWeek &&
                    (m.home?.teamId === myTeam.id ||
                      m.away?.teamId === myTeam.id),
                );
                const oppTeamId = matchup
                  ? matchup.home?.teamId === myTeam.id
                    ? matchup.away?.teamId
                    : matchup.home?.teamId
                  : null;
                const oppTeam =
                  oppTeamId != null
                    ? (leagueData.teams || []).find((t) => t.id === oppTeamId)
                    : null;

                const myStartersResolved = (myTeam.roster?.entries || [])
                  .map((entry) => resolveEspnPlayer(entry, espnWeek))
                  .filter(Boolean)
                  .map((p) => ({ ...p, team: normTeam(p.team) }));
                const oppStartersResolved = (oppTeam?.roster?.entries || [])
                  .map((entry) => resolveEspnPlayer(entry, espnWeek))
                  .filter(Boolean)
                  .map((p) => ({ ...p, team: normTeam(p.team) }));

                // ESPN's matchup.home/away.totalPoints does NOT update live —
                // it sits at 0 until the league fully closes out the week,
                // even while individual players' actual stats (statSourceId
                // 0) are already posted and updating in real time. Sum the
                // starters' live points ourselves instead of trusting that
                // field (confirmed directly against live league data).
                const sumStarterPoints = (starters) =>
                  round1(starters.reduce((sum, p) => sum + (p.points || 0), 0));

                matchups.push({
                  league: label,
                  platform: "ESPN",
                  leagueId: league.leagueId,
                  espnTeamId: league.espnTeamId,
                  season: league.season,
                  myTeamName: espnTeamName(myTeam),
                  myScore: sumStarterPoints(myStartersResolved),
                  myRecord: recordStr(
                    myTeam.record?.overall?.wins,
                    myTeam.record?.overall?.losses,
                    myTeam.record?.overall?.ties,
                  ),
                  oppTeamName: oppTeam ? espnTeamName(oppTeam) : null,
                  oppScore: oppTeam ? sumStarterPoints(oppStartersResolved) : null,
                  oppRecord: oppTeam
                    ? recordStr(
                        oppTeam.record?.overall?.wins,
                        oppTeam.record?.overall?.losses,
                        oppTeam.record?.overall?.ties,
                      )
                    : null,
                  bye: !oppTeam,
                  // Used to build the "who's left to play" projection once
                  // the scoreboard is in — stripped before the response goes out.
                  myStarters: myStartersResolved,
                  oppStarters: oppStartersResolved,
                });

                myStartersResolved.forEach((p) =>
                  pushEntry(rootForByTeam, p.team, {
                    name: p.name,
                    pos: p.pos,
                    league: label,
                    points: p.points,
                  }),
                );

                oppStartersResolved.forEach((p) =>
                  pushEntry(rootAgainstByTeam, p.team, {
                    name: p.name,
                    pos: p.pos,
                    league: label,
                    points: p.points,
                  }),
                );
              }
            } catch (leagueErr) {
              console.error(`Failed to load league ${league.sk}:`, leagueErr);
              leagueErrors.push({ league: label, message: leagueErr.message });
            }
          }),
        ),
      ]);

      const teamsPlayingThisWeek = new Set(
        (scoreboard.events || []).flatMap((ev) =>
          (ev.competitions?.[0]?.competitors || []).map((c) =>
            normTeam(c.team.abbreviation),
          ),
        ),
      );
      const byePlayers = Object.entries(rootForByTeam)
        .filter(([team]) => !teamsPlayingThisWeek.has(team))
        .flatMap(([, entries]) => entries);

      const gameStateByTeam = {};
      (scoreboard.events || []).forEach((ev) => {
        const comp = ev.competitions?.[0];
        const completed = !!comp?.status?.type?.completed;
        (comp?.competitors || []).forEach((c) => {
          gameStateByTeam[normTeam(c.team.abbreviation)] = { completed };
        });
      });

      matchups.forEach((m) => {
        if (m.bye) return;
        m.projection = buildProjection(
          m.myScore,
          m.oppScore,
          m.myStarters || [],
          m.oppStarters || [],
          teamsPlayingThisWeek,
          gameStateByTeam,
        );
        delete m.myStarters;
        delete m.oppStarters;
      });

      const games = (scoreboard.events || [])
        .map((ev) => {
          const comp = ev.competitions?.[0];
          const teamAbbrevs = (comp?.competitors || []).map((c) =>
            normTeam(c.team.abbreviation),
          );
          const rootFor = teamAbbrevs.flatMap((t) => rootForByTeam[t] || []);
          const rootAgainst = teamAbbrevs.flatMap(
            (t) => rootAgainstByTeam[t] || [],
          );
          const completed = !!comp?.status?.type?.completed;

          let winningTeam = null;
          if (completed) {
            const scored = (comp?.competitors || []).map((c) => ({
              team: normTeam(c.team.abbreviation),
              score: Number(c.score) || 0,
            }));
            if (scored.length === 2 && scored[0].score !== scored[1].score) {
              winningTeam = scored.reduce((a, b) =>
                a.score > b.score ? a : b,
              ).team;
            }
          }

          return {
            id: ev.id,
            name: ev.name,
            shortName: ev.shortName,
            date: ev.date,
            status: comp?.status?.type?.description || "Scheduled",
            state: comp?.status?.type?.state || "pre",
            liveDetail: comp?.status?.type?.shortDetail || null,
            completed,
            winningTeam,
            broadcast: comp?.broadcasts?.[0]?.names?.[0] || null,
            teams: (comp?.competitors || []).map((c) => ({
              abbreviation: c.team.abbreviation,
              displayName: c.team.displayName,
              homeAway: c.homeAway,
              score: c.score,
            })),
            rootFor,
            rootAgainst,
          };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          week,
          season,
          matchups,
          byePlayers,
          games,
          leaguesLinked: leagues.length,
          leagueErrors,
        }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    console.error("Fantasy Lambda Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

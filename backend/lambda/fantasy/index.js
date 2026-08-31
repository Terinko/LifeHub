/* eslint-disable no-undef */
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  GetCommand,
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
}

function maskLeague(item) {
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
      name:
        p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      team: p.team,
      pos: p.position,
    };
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

function resolveEspnPlayer(entry) {
  if (ESPN_BENCH_SLOTS.includes(entry.lineupSlotId)) return null;
  const player = entry.playerPoolEntry?.player || entry.player;
  if (!player) return null;
  return {
    name: player.fullName,
    team: ESPN_PRO_TEAM_MAP[player.proTeamId] || "FA",
    pos: ESPN_POSITION_MAP[entry.lineupSlotId] || "",
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
            body: JSON.stringify({ error: "Could not find that Sleeper league. Double check the League ID." }),
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
        await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { statusCode: 200, headers, body: JSON.stringify(maskLeague(item)) };
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
        await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { statusCode: 200, headers, body: JSON.stringify(maskLeague(item)) };
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

      const sleeperState = await fetchJson("https://api.sleeper.app/v1/state/nfl");
      const week = Number(event.queryStringParameters?.week) || sleeperState.week || 1;
      const season = event.queryStringParameters?.season || sleeperState.season;

      const needsSleeperPlayers = leagues.some((l) => l.platform === "SLEEPER");
      const sleeperPlayers = needsSleeperPlayers
        ? await getSleeperPlayerCache()
        : null;

      const rootForByTeam = {};
      const rootAgainstByTeam = {};
      const leagueErrors = [];

      const pushEntry = (map, team, entry) => {
        const t = normTeam(team);
        if (!t || t === "FA") return;
        if (!map[t]) map[t] = [];
        if (!map[t].some((e) => e.name === entry.name && e.league === entry.league)) {
          map[t].push(entry);
        }
      };

      await Promise.all(
        leagues.map(async (league) => {
          const label =
            league.nickname ||
            `${league.platform === "SLEEPER" ? "Sleeper" : "ESPN"} League ${String(league.leagueId).slice(-4)}`;

          try {
            if (league.platform === "SLEEPER") {
              const [rosters, matchups] = await Promise.all([
                fetchJson(`https://api.sleeper.app/v1/league/${league.leagueId}/rosters`),
                fetchJson(`https://api.sleeper.app/v1/league/${league.leagueId}/matchups/${week}`),
              ]);
              const myRoster = rosters.find((r) => r.owner_id === league.sleeperUserId);
              if (!myRoster) return;
              const myMatchup = matchups.find((m) => m.roster_id === myRoster.roster_id);
              if (!myMatchup) return;
              const oppMatchup = matchups.find(
                (m) => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myRoster.roster_id,
              );

              (myMatchup.starters || [])
                .filter((id) => id && id !== "0")
                .forEach((pid) => {
                  const p = resolveSleeperPlayer(pid, sleeperPlayers);
                  if (p) pushEntry(rootForByTeam, p.team, { name: p.name, pos: p.pos, league: label });
                });

              (oppMatchup?.starters || [])
                .filter((id) => id && id !== "0")
                .forEach((pid) => {
                  const p = resolveSleeperPlayer(pid, sleeperPlayers);
                  if (p) pushEntry(rootAgainstByTeam, p.team, { name: p.name, pos: p.pos, league: label });
                });
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
                cookieHeader ? { headers: { Cookie: cookieHeader } } : undefined,
              );

              const espnWeek = week || leagueData.status?.currentMatchupPeriod || 1;
              const myTeam = (leagueData.teams || []).find(
                (t) => String(t.id) === String(league.espnTeamId),
              );
              if (!myTeam) return;

              const matchup = (leagueData.schedule || []).find(
                (m) =>
                  m.matchupPeriodId === espnWeek &&
                  (m.home?.teamId === myTeam.id || m.away?.teamId === myTeam.id),
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

              (myTeam.roster?.entries || []).forEach((entry) => {
                const p = resolveEspnPlayer(entry);
                if (p) pushEntry(rootForByTeam, p.team, { name: p.name, pos: p.pos, league: label });
              });

              (oppTeam?.roster?.entries || []).forEach((entry) => {
                const p = resolveEspnPlayer(entry);
                if (p) pushEntry(rootAgainstByTeam, p.team, { name: p.name, pos: p.pos, league: label });
              });
            }
          } catch (leagueErr) {
            console.error(`Failed to load league ${league.sk}:`, leagueErr);
            leagueErrors.push({ league: label, message: leagueErr.message });
          }
        }),
      );

      const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2${season ? `&dates=${season}` : ""}`;
      const scoreboard = await fetchJson(scoreboardUrl);

      const games = (scoreboard.events || [])
        .map((ev) => {
          const comp = ev.competitions?.[0];
          const teamAbbrevs = (comp?.competitors || []).map((c) =>
            normTeam(c.team.abbreviation),
          );
          const rootFor = teamAbbrevs.flatMap((t) => rootForByTeam[t] || []);
          const rootAgainst = teamAbbrevs.flatMap((t) => rootAgainstByTeam[t] || []);

          return {
            id: ev.id,
            name: ev.name,
            shortName: ev.shortName,
            date: ev.date,
            status: comp?.status?.type?.description || "Scheduled",
            completed: !!comp?.status?.type?.completed,
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

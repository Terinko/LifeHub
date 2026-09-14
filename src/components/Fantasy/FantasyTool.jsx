/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import "./FantasyTool.css";

const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

const emptyForm = {
  platform: "SLEEPER",
  nickname: "",
  leagueId: "",
  sleeperUsername: "",
  espnSeason: String(new Date().getFullYear()),
  espnTeamId: "",
  espnS2: "",
  espnSwid: "",
};

const FantasyTool = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("guide");

  const [leagues, setLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [guide, setGuide] = useState(null);
  const [loadingGuide, setLoadingGuide] = useState(true);
  const [showAllGames, setShowAllGames] = useState(false);
  const [showCompletedGames, setShowCompletedGames] = useState(false);
  const [expandedGameId, setExpandedGameId] = useState(null);
  // Per-game box score, fetched only when that game is expanded. Keyed by
  // game id: { loading, teams }.
  const [boxScores, setBoxScores] = useState({});

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const getAuthHeaders = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const res = await fetch(`${API_BASE}/fantasy/leagues`, {
        headers: await getAuthHeaders(),
      });
      const items = await res.json();
      setLeagues(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error(e);
    }
    setLoadingLeagues(false);
  };

  // `background` skips the loading-state flash — used by the auto-refresh
  // poll below so live scores update in place instead of the whole guide
  // blanking out to "Loading..." every 30s.
  const loadGuide = async (background = false) => {
    if (!background) setLoadingGuide(true);
    try {
      // Belt-and-suspenders against any client/network-level caching (seen
      // on iOS Safari PWAs especially) silently serving a stale response
      // instead of the live score — force a real network hit every time.
      const res = await fetch(
        `${API_BASE}/fantasy/guide?_=${Date.now()}`,
        {
          headers: await getAuthHeaders(),
          cache: "no-store",
        },
      );
      const json = await res.json();
      setGuide(json);
    } catch (e) {
      console.error(e);
    }
    if (!background) setLoadingGuide(false);
  };

  useEffect(() => {
    loadLeagues();
    loadGuide();
  }, []);

  // Live scores don't push — nothing was ever re-fetching after the initial
  // load, so the scoreboard just sat frozen at whatever it showed on page
  // load. Poll while the guide tab is actually being looked at, and refresh
  // immediately when the tab regains focus (e.g. switching back from
  // another app mid-game).
  useEffect(() => {
    if (activeTab !== "guide") return undefined;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") loadGuide(true);
    };
    const interval = setInterval(refreshIfVisible, 30000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [activeTab]);

  const handleAddLeague = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.leagueId) {
      setFormError("League ID is required.");
      return;
    }

    const body = {
      platform: form.platform,
      leagueId: form.leagueId.trim(),
      nickname: form.nickname.trim() || undefined,
    };

    if (form.platform === "SLEEPER") {
      if (!form.sleeperUsername) {
        setFormError("Your Sleeper username is required.");
        return;
      }
      body.sleeperUsername = form.sleeperUsername.trim();
    } else {
      if (!form.espnTeamId) {
        setFormError("Your ESPN team ID is required.");
        return;
      }
      body.espnTeamId = form.espnTeamId.trim();
      body.season = form.espnSeason.trim();
      if (form.espnS2 && form.espnSwid) {
        body.espnCookies = { espn_s2: form.espnS2.trim(), swid: form.espnSwid.trim() };
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/fantasy/leagues`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error || "Failed to link league.");
        setSubmitting(false);
        return;
      }
      setForm(emptyForm);
      await loadLeagues();
      await loadGuide();
    } catch (err) {
      setFormError(err.message);
    }
    setSubmitting(false);
  };

  const handleUnlink = async (league) => {
    if (!window.confirm(`Unlink "${league.nickname || league.leagueId}"?`)) return;
    try {
      const res = await fetch(
        `${API_BASE}/fantasy/leagues/${encodeURIComponent(league.sk)}`,
        { method: "DELETE", headers: await getAuthHeaders() },
      );
      if (!res.ok) {
        alert("Failed to unlink that league. Try again.");
        return;
      }
      await loadLeagues();
      await loadGuide();
    } catch (e) {
      console.error(e);
      alert("Failed to unlink that league. Try again.");
    }
  };

  const formatKickoff = (dateStr) =>
    new Date(dateStr).toLocaleString([], {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });

  const statusClass = (game) => {
    if (game.completed) return "status-final";
    if (game.state === "in") return "status-live";
    return "status-scheduled";
  };

  const gameUrl = (game) => `https://www.espn.com/nfl/game/_/gameId/${game.id}`;

  const matchupUrl = (m) =>
    m.platform === "SLEEPER"
      ? `https://sleeper.com/leagues/${m.leagueId}`
      : `https://fantasy.espn.com/football/team?leagueId=${m.leagueId}&teamId=${m.espnTeamId}&seasonId=${m.season}`;

  const openInNewTab = (url) => window.open(url, "_blank", "noopener,noreferrer");

  // Which columns from ESPN's public box score are actually worth showing
  // per stat group — the raw counting stats, not derived ones like AVG/QBR.
  const BOX_SCORE_GROUPS = {
    passing: ["C/ATT", "YDS", "TD", "INT"],
    rushing: ["CAR", "YDS", "TD"],
    receiving: ["REC", "YDS", "TD"],
    kicking: ["FG", "XP"],
  };

  const normalizePlayerName = (name) =>
    (name || "").toLowerCase().replace(/[.'-]/g, "").trim();

  // ESPN's public (no-auth) box score summary — a different, CORS-open
  // endpoint from the fantasy APIs, so this works the same whether the
  // league is Sleeper or ESPN. Fetched directly from the browser since it's
  // fully public data.
  const loadBoxScore = async (gameId) => {
    setBoxScores((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], loading: true },
    }));
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`,
      );
      const json = await res.json();
      setBoxScores((prev) => ({
        ...prev,
        [gameId]: { loading: false, teams: json.boxscore?.players || [] },
      }));
    } catch (e) {
      console.error(e);
      setBoxScores((prev) => ({
        ...prev,
        [gameId]: { loading: false, teams: null },
      }));
    }
  };

  // Finds a player across both teams' box score stat groups and builds a
  // compact line like "6 REC, 49 YDS, 1 TD" — joining multiple groups
  // (e.g. a dual-threat back) with " · ". Returns null if there's no match
  // (name mismatch, defense/special teams, etc.) so the row is just omitted.
  const findPlayerStatLine = (teams, playerName) => {
    if (!teams) return null;
    const target = normalizePlayerName(playerName);
    const segments = [];
    teams.forEach((teamBlock) => {
      (teamBlock.statistics || []).forEach((group) => {
        const wantedLabels = BOX_SCORE_GROUPS[group.name];
        if (!wantedLabels) return;
        const athleteRow = (group.athletes || []).find(
          (a) => normalizePlayerName(a.athlete?.displayName) === target,
        );
        if (!athleteRow) return;
        const parts = wantedLabels
          .map((label) => {
            const idx = group.labels.indexOf(label);
            if (idx === -1) return null;
            const val = athleteRow.stats[idx];
            return val && val !== "0" ? `${val} ${label}` : null;
          })
          .filter(Boolean);
        if (parts.length) segments.push(parts.join(", "));
      });
    });
    return segments.length ? segments.join(" · ") : null;
  };

  const formatPoints = (points) =>
    points.map((pt) => (pt != null ? pt.toFixed(1) : "–")).join(" / ");

  const renderStakeRow = (p) => (
    <div key={p.name} className="stake-row">
      <div className="stake-player-info">
        <div className="stake-player">
          {p.name} <span className="stake-pos">{p.pos}</span>
        </div>
        <div className="stake-leagues">{p.leagues.join(", ")}</div>
      </div>
      <div className="stake-points">{formatPoints(p.points)} pts</div>
    </div>
  );

  return (
    <div className="view tool-view">
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>Fantasy</h2>
        <div style={{ width: "36px" }}></div>
      </header>

      <div className="ios-segmented-control">
        <button
          className={`segmented-btn ${activeTab === "guide" ? "active" : ""}`}
          onClick={() => setActiveTab("guide")}
        >
          This Week
        </button>
        <button
          className={`segmented-btn ${activeTab === "leagues" ? "active" : ""}`}
          onClick={() => setActiveTab("leagues")}
        >
          My Leagues
        </button>
      </div>

      <div className="tool-content">
        {activeTab === "guide" && (
          <div className="list-container">
            {loadingGuide && (
              <p style={{ textAlign: "center", color: "#8c9288" }}>
                Loading this week's slate...
              </p>
            )}

            {!loadingGuide && guide?.leaguesLinked === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🏈</div>
                <p>No leagues linked yet</p>
                <small>
                  Link a Sleeper or ESPN league in the "My Leagues" tab to
                  build your watch-along guide.
                </small>
              </div>
            )}

            {!loadingGuide && guide && guide.leaguesLinked > 0 && (
              <>
                {guide.week && (
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#8c9288",
                      marginBottom: "4px",
                    }}
                  >
                    Week {guide.week}
                  </div>
                )}

                {guide.leagueErrors?.length > 0 &&
                  guide.leagueErrors.map((e, i) => (
                    <div key={i} className="league-warning">
                      <strong>{e.league}</strong> failed to load: {e.message}
                    </div>
                  ))}

                {guide.matchups?.length > 0 && (
                  <>
                    <div className="section-heading">Your Matchups</div>
                    {guide.matchups.map((m, i) => {
                      const status = m.bye ? null : m.projection;
                      return (
                        <div
                          key={i}
                          className="matchup-card clickable-card"
                          onClick={() => openInNewTab(matchupUrl(m))}
                        >
                          <div className="matchup-league-label">
                            {m.league} <span className="external-hint">↗</span>
                          </div>
                          {m.bye ? (
                            <div style={{ fontSize: "14px", color: "#8c9288" }}>
                              {m.myTeamName}
                              {m.noMatchupYet
                                ? " — no matchup data yet (still drafting or preseason)"
                                : " — bye week, no matchup"}
                            </div>
                          ) : (
                            <div className="matchup-row">
                              <div className="matchup-team">
                                <div className="matchup-team-name">
                                  {m.myTeamName}
                                </div>
                                <div className="matchup-team-record">
                                  {m.myRecord}
                                </div>
                                <div className="matchup-score">
                                  {Number(m.myScore).toFixed(1)}
                                </div>
                              </div>
                              <div className="matchup-vs">VS</div>
                              <div className="matchup-team opp">
                                <div className="matchup-team-name">
                                  {m.oppTeamName}
                                </div>
                                <div className="matchup-team-record">
                                  {m.oppRecord}
                                </div>
                                <div className="matchup-score">
                                  {Number(m.oppScore).toFixed(1)}
                                </div>
                              </div>
                            </div>
                          )}
                          {status && (
                            <div className={`matchup-margin ${status.cls}`}>
                              {status.text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {guide.byePlayers?.length > 0 && (
                  <div className="bye-banner">
                    <strong>🛌 On Bye This Week</strong>
                    {guide.byePlayers
                      .map((p) => `${p.name} (${p.leagues.join(", ")})`)
                      .join(" • ")}
                  </div>
                )}


                {guide.games.length === 0 && (
                  <p style={{ textAlign: "center", color: "#8c9288" }}>
                    No games scheduled this week.
                  </p>
                )}

                {(() => {
                  const stakesGames = guide.games.filter(
                    (g) => g.rootFor.length > 0 || g.rootAgainst.length > 0,
                  );
                  const liveStakesGames = stakesGames.filter((g) => !g.completed);
                  const completedStakesGames = stakesGames.filter(
                    (g) => g.completed,
                  );
                  const otherGames = guide.games.filter(
                    (g) => g.rootFor.length === 0 && g.rootAgainst.length === 0,
                  );

                  const renderStakesGameCard = (game) => {
                    const isExpanded = expandedGameId === game.id;
                    return (
                      <div
                        key={game.id}
                        className="game-card clickable-card"
                        onClick={() => {
                          const next = isExpanded ? null : game.id;
                          setExpandedGameId(next);
                          if (next) loadBoxScore(next);
                        }}
                      >
                        <div className="game-card-header">
                          <div>
                            <div className="game-matchup">
                              {game.shortName}{" "}
                              <span className="external-hint">
                                {isExpanded ? "▾" : "▸"}
                              </span>
                            </div>
                            <div className="game-meta">
                              {game.completed
                                ? `Final ${game.teams
                                    .map((t) => `${t.abbreviation} ${t.score}`)
                                    .join(" - ")}`
                                : game.liveDetail || formatKickoff(game.date)}
                              {game.broadcast ? ` • ${game.broadcast}` : ""}
                            </div>
                          </div>
                          <span className={`status-badge ${statusClass(game)}`}>
                            {game.completed ? "Final" : game.status}
                          </span>
                        </div>

                        {game.rootFor.length > 0 && (
                          <div className="stake-section">
                            <div className="stake-label root-for">
                              🟢 Rooting For
                            </div>
                            {game.rootFor.map((p) => renderStakeRow(p))}
                          </div>
                        )}

                        {game.rootAgainst.length > 0 && (
                          <div className="stake-section">
                            <div className="stake-label root-against">
                              🔴 Rooting Against
                            </div>
                            {game.rootAgainst.map((p) => renderStakeRow(p))}
                          </div>
                        )}

                        {isExpanded && (
                          <div className="box-score-panel">
                            <div className="box-score-heading">
                              📊 Player Stats
                            </div>
                            {boxScores[game.id]?.loading && (
                              <div className="box-score-loading">
                                Loading stats...
                              </div>
                            )}
                            {!boxScores[game.id]?.loading &&
                              boxScores[game.id]?.teams &&
                              (() => {
                                const rows = [
                                  ...game.rootFor,
                                  ...game.rootAgainst,
                                ]
                                  .map((p) => ({
                                    name: p.name,
                                    line: findPlayerStatLine(
                                      boxScores[game.id].teams,
                                      p.name,
                                    ),
                                  }))
                                  .filter((r) => r.line);
                                return rows.length > 0 ? (
                                  rows.map((r) => (
                                    <div
                                      key={r.name}
                                      className="box-score-row"
                                    >
                                      <span className="box-score-player">
                                        {r.name}
                                      </span>
                                      <span className="box-score-line">
                                        {r.line}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="box-score-loading">
                                    No stat lines yet.
                                  </div>
                                );
                              })()}
                            {!boxScores[game.id]?.loading &&
                              boxScores[game.id]?.teams === null && (
                                <div className="box-score-loading">
                                  Couldn't load stats for this game.
                                </div>
                              )}
                          </div>
                        )}

                        {isExpanded && (
                          <button
                            className="toggle-games-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInNewTab(gameUrl(game));
                            }}
                          >
                            Open live Gamecast on ESPN ↗
                          </button>
                        )}
                      </div>
                    );
                  };

                  return (
                    <>
                      {(liveStakesGames.length > 0 ||
                        completedStakesGames.length > 0) && (
                        <div className="section-heading">Games With Stakes</div>
                      )}
                      {liveStakesGames.map(renderStakesGameCard)}

                      {completedStakesGames.length > 0 && (
                        <button
                          className="toggle-games-btn"
                          onClick={() => setShowCompletedGames(!showCompletedGames)}
                        >
                          {showCompletedGames ? "▾ Hide" : "▸ Show"}{" "}
                          {completedStakesGames.length} completed game
                          {completedStakesGames.length === 1 ? "" : "s"}
                        </button>
                      )}
                      {showCompletedGames && completedStakesGames.map(renderStakesGameCard)}

                      {otherGames.length > 0 && (
                        <button
                          className="toggle-games-btn"
                          onClick={() => setShowAllGames(!showAllGames)}
                        >
                          {showAllGames ? "▾ Hide" : "▸ Show"} {otherGames.length} other
                          game{otherGames.length === 1 ? "" : "s"} with no stake
                        </button>
                      )}

                      {showAllGames && otherGames.length > 0 && (
                        <div className="game-card">
                          {otherGames.map((game) => (
                            <div
                              key={game.id}
                              className="game-row-compact clickable-card"
                              onClick={() => openInNewTab(gameUrl(game))}
                            >
                              <div>
                                <div className="game-matchup">
                                  {game.shortName} <span className="external-hint">↗</span>
                                </div>
                                <div className="game-meta">
                                  {formatKickoff(game.date)}
                                  {game.broadcast ? ` • ${game.broadcast}` : ""}
                                </div>
                              </div>
                              <span className={`status-badge ${statusClass(game)}`}>
                                {game.completed ? "Final" : game.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {activeTab === "leagues" && (
          <div className="list-container">
            {loadingLeagues && (
              <p style={{ textAlign: "center", color: "#8c9288" }}>
                Loading your leagues...
              </p>
            )}

            {!loadingLeagues && leagues.length === 0 && (
              <p style={{ textAlign: "center", color: "#8c9288" }}>
                No leagues linked yet.
              </p>
            )}

            {leagues.map((league) => (
              <div key={league.sk} className="league-card">
                <div className="league-info">
                  <div className="league-name">
                    {league.platform === "SLEEPER" ? "😴" : "🏈"}{" "}
                    {league.nickname ||
                      `${league.platform === "SLEEPER" ? "Sleeper" : "ESPN"} League ${league.leagueId}`}
                  </div>
                  <div className="league-detail">
                    {league.platform === "SLEEPER"
                      ? `Playing as ${league.sleeperUsername}`
                      : `Team ID ${league.espnTeamId} • Season ${league.season}${
                          league.hasCookies ? " • 🔒 cookies saved" : ""
                        }`}
                  </div>
                </div>
                <button className="unlink-btn" onClick={() => handleUnlink(league)}>
                  Unlink
                </button>
              </div>
            ))}

            <div className="add-league-card">
              <h4>Link a League</h4>

              {formError && <div className="form-error">{formError}</div>}

              <div className="platform-toggle">
                <button
                  type="button"
                  className={`platform-btn ${form.platform === "SLEEPER" ? "active" : ""}`}
                  onClick={() => setForm({ ...emptyForm, platform: "SLEEPER" })}
                >
                  Sleeper
                </button>
                <button
                  type="button"
                  className={`platform-btn ${form.platform === "ESPN" ? "active" : ""}`}
                  onClick={() => setForm({ ...emptyForm, platform: "ESPN" })}
                >
                  ESPN
                </button>
              </div>

              <form onSubmit={handleAddLeague}>
                <div className="field-group">
                  <label className="field-label">Nickname (optional)</label>
                  <input
                    className="ios-input-modal"
                    placeholder="e.g. Work League"
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">League ID</label>
                  <input
                    className="ios-input-modal"
                    placeholder={form.platform === "SLEEPER" ? "e.g. 289646328504385536" : "e.g. 1234567"}
                    value={form.leagueId}
                    onChange={(e) => setForm({ ...form, leagueId: e.target.value })}
                  />
                </div>

                {form.platform === "SLEEPER" && (
                  <div className="field-group">
                    <label className="field-label">Your Sleeper Username</label>
                    <input
                      className="ios-input-modal"
                      placeholder="Your display name in this league"
                      value={form.sleeperUsername}
                      onChange={(e) =>
                        setForm({ ...form, sleeperUsername: e.target.value })
                      }
                    />
                  </div>
                )}

                {form.platform === "ESPN" && (
                  <>
                    <div className="field-group">
                      <label className="field-label">Season</label>
                      <input
                        className="ios-input-modal"
                        value={form.espnSeason}
                        onChange={(e) =>
                          setForm({ ...form, espnSeason: e.target.value })
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Your Team ID</label>
                      <input
                        className="ios-input-modal"
                        placeholder="Found in your team's ESPN URL"
                        value={form.espnTeamId}
                        onChange={(e) =>
                          setForm({ ...form, espnTeamId: e.target.value })
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">
                        espn_s2 cookie {leagues.some((l) => l.platform === "ESPN" && l.leagueId === form.leagueId.trim() && l.hasCookies) ? "(leave blank to keep saved)" : "(private leagues only)"}
                      </label>
                      <input
                        className="ios-input-modal"
                        type="password"
                        placeholder="Paste espn_s2 value"
                        value={form.espnS2}
                        onChange={(e) => setForm({ ...form, espnS2: e.target.value })}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">SWID cookie</label>
                      <input
                        className="ios-input-modal"
                        type="password"
                        placeholder="Paste SWID value (with braces)"
                        value={form.espnSwid}
                        onChange={(e) => setForm({ ...form, espnSwid: e.target.value })}
                      />
                      <div className="field-help">
                        For a private ESPN league: log into espn.com in your
                        browser, open dev tools → Application/Storage →
                        Cookies, and copy the <code>espn_s2</code> and{" "}
                        <code>SWID</code> values. They're stored encrypted and
                        never shown again after saving — only used server-side
                        to fetch your roster.
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="ios-submit-btn full-width"
                  disabled={submitting}
                  style={{ marginTop: "8px" }}
                >
                  {submitting ? "Linking..." : "Link League"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FantasyTool;

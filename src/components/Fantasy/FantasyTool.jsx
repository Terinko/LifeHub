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
  const [guide, setGuide] = useState(null);
  const [loadingGuide, setLoadingGuide] = useState(true);
  const [showAllGames, setShowAllGames] = useState(false);
  const [expandedGameId, setExpandedGameId] = useState(null);

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
    try {
      const res = await fetch(`${API_BASE}/fantasy/leagues`, {
        headers: await getAuthHeaders(),
      });
      const items = await res.json();
      setLeagues(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGuide = async () => {
    setLoadingGuide(true);
    try {
      const res = await fetch(`${API_BASE}/fantasy/guide`, {
        headers: await getAuthHeaders(),
      });
      const json = await res.json();
      setGuide(json);
    } catch (e) {
      console.error(e);
    }
    setLoadingGuide(false);
  };

  useEffect(() => {
    loadLeagues();
    loadGuide();
  }, []);

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
      await fetch(`${API_BASE}/fantasy/leagues/${encodeURIComponent(league.sk)}`, {
        method: "DELETE",
        headers: await getAuthHeaders(),
      });
      await loadLeagues();
      await loadGuide();
    } catch (e) {
      console.error(e);
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
    if (game.status && game.status.toLowerCase().includes("progress"))
      return "status-live";
    return "status-scheduled";
  };

  const gameUrl = (game) => `https://www.espn.com/nfl/game/_/gameId/${game.id}`;

  const matchupUrl = (m) =>
    m.platform === "SLEEPER"
      ? `https://sleeper.com/leagues/${m.leagueId}`
      : `https://fantasy.espn.com/football/team?leagueId=${m.leagueId}&teamId=${m.espnTeamId}&seasonId=${m.season}`;

  const openInNewTab = (url) => window.open(url, "_blank", "noopener,noreferrer");

  const sumPoints = (players) =>
    players.reduce((sum, p) => sum + (p.points || 0), 0);

  const matchupMarginText = (m) => {
    const my = Number(m.myScore) || 0;
    const opp = Number(m.oppScore) || 0;
    if (my === 0 && opp === 0) return null; // nothing on the board yet
    const diff = Math.abs(my - opp).toFixed(1);
    if (my === opp) return "Tied up right now.";
    return my > opp ? `Leading by ${diff} pts.` : `Need ${diff}+ more pts to take the lead.`;
  };

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
                    {guide.matchups.map((m, i) => (
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
                            {m.myTeamName} — bye week, no matchup
                          </div>
                        ) : (
                          <div className="matchup-row">
                            <div className="matchup-team">
                              <div className="matchup-team-name">{m.myTeamName}</div>
                              <div className="matchup-team-record">{m.myRecord}</div>
                              <div className="matchup-score">
                                {Number(m.myScore).toFixed(1)}
                              </div>
                            </div>
                            <div className="matchup-vs">VS</div>
                            <div className="matchup-team opp">
                              <div className="matchup-team-name">{m.oppTeamName}</div>
                              <div className="matchup-team-record">{m.oppRecord}</div>
                              <div className="matchup-score">
                                {Number(m.oppScore).toFixed(1)}
                              </div>
                            </div>
                          </div>
                        )}
                        {!m.bye && matchupMarginText(m) && (
                          <div className="matchup-margin">{matchupMarginText(m)}</div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {guide.byePlayers?.length > 0 && (
                  <div className="bye-banner">
                    <strong>🛌 On Bye This Week</strong>
                    {guide.byePlayers
                      .map((p) => `${p.name} (${p.league})`)
                      .join(" • ")}
                  </div>
                )}

                {guide.recap && (
                  <div className="recap-card">
                    <h4>📋 How It Went</h4>
                    {guide.recap.rootForWins.map((p, i) => (
                      <div key={`ffw-${i}`} className="recap-row">
                        <span>
                          <span className="recap-icon">✅</span>
                          <span className="stake-player">{p.name}</span>'s team won
                          ({p.game})
                        </span>
                        <span className="stake-league">{p.league}</span>
                      </div>
                    ))}
                    {guide.recap.rootAgainstLosses.map((p, i) => (
                      <div key={`fal-${i}`} className="recap-row">
                        <span>
                          <span className="recap-icon">😈</span>
                          <span className="stake-player">{p.name}</span>'s team lost
                          ({p.game})
                        </span>
                        <span className="stake-league">{p.league}</span>
                      </div>
                    ))}
                    {guide.recap.rootForLosses.map((p, i) => (
                      <div key={`ffl-${i}`} className="recap-row">
                        <span>
                          <span className="recap-icon">❌</span>
                          <span className="stake-player">{p.name}</span>'s team lost
                          ({p.game})
                        </span>
                        <span className="stake-league">{p.league}</span>
                      </div>
                    ))}
                    {guide.recap.rootAgainstWins.map((p, i) => (
                      <div key={`faw-${i}`} className="recap-row">
                        <span>
                          <span className="recap-icon">😬</span>
                          <span className="stake-player">{p.name}</span>'s team won
                          ({p.game})
                        </span>
                        <span className="stake-league">{p.league}</span>
                      </div>
                    ))}
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
                  const otherGames = guide.games.filter(
                    (g) => g.rootFor.length === 0 && g.rootAgainst.length === 0,
                  );

                  return (
                    <>
                      {stakesGames.length > 0 && (
                        <div className="section-heading">Games With Stakes</div>
                      )}
                      {stakesGames.map((game) => {
                        const isExpanded = expandedGameId === game.id;
                        const forPts = sumPoints(game.rootFor);
                        const againstPts = sumPoints(game.rootAgainst);
                        return (
                          <div
                            key={game.id}
                            className="game-card clickable-card"
                            onClick={() =>
                              setExpandedGameId(isExpanded ? null : game.id)
                            }
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
                                {game.rootFor.map((p, i) => (
                                  <div key={i} className="stake-row">
                                    <span className="stake-player">
                                      {p.name}{" "}
                                      <span style={{ fontWeight: 400, color: "#8c9288" }}>
                                        {p.pos}
                                      </span>
                                    </span>
                                    <span className="stake-league">
                                      {isExpanded && p.points != null
                                        ? `${p.points} pts`
                                        : p.league}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {game.rootAgainst.length > 0 && (
                              <div className="stake-section">
                                <div className="stake-label root-against">
                                  🔴 Rooting Against
                                </div>
                                {game.rootAgainst.map((p, i) => (
                                  <div key={i} className="stake-row">
                                    <span className="stake-player">
                                      {p.name}{" "}
                                      <span style={{ fontWeight: 400, color: "#8c9288" }}>
                                        {p.pos}
                                      </span>
                                    </span>
                                    <span className="stake-league">
                                      {isExpanded && p.points != null
                                        ? `${p.points} pts`
                                        : p.league}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {isExpanded &&
                              game.rootFor.length > 0 &&
                              game.rootAgainst.length > 0 && (
                                <div className="stakes-tally">
                                  {forPts === againstPts
                                    ? "Your players are dead even right now."
                                    : forPts > againstPts
                                      ? `Your side is ahead, ${forPts.toFixed(1)} to ${againstPts.toFixed(1)} fantasy pts.`
                                      : `You're getting outscored, ${againstPts.toFixed(1)} to ${forPts.toFixed(1)} fantasy pts.`}
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
                      })}

                      {otherGames.length > 0 && (
                        <button
                          className="toggle-games-btn"
                          onClick={() => setShowAllGames(!showAllGames)}
                        >
                          {showAllGames ? "▲ Hide" : "▼ Show"} {otherGames.length} other
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
            {leagues.length === 0 && (
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
                        espn_s2 cookie {leagues.some((l) => l.platform === "ESPN" && l.leagueId === form.leagueId && l.hasCookies) ? "(leave blank to keep saved)" : "(private leagues only)"}
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

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

                {guide.leagueErrors?.length > 0 && (
                  <div className="league-warning">
                    Couldn't load: {guide.leagueErrors.join(", ")}. Check that
                    the league is still valid (and, for ESPN, that its
                    cookies haven't expired).
                  </div>
                )}

                {guide.games.length === 0 && (
                  <p style={{ textAlign: "center", color: "#8c9288" }}>
                    No games scheduled this week.
                  </p>
                )}

                {guide.games.map((game) => (
                  <div key={game.id} className="game-card">
                    <div className="game-card-header">
                      <div>
                        <div className="game-matchup">{game.shortName}</div>
                        <div className="game-meta">
                          {formatKickoff(game.date)}
                          {game.broadcast ? ` • ${game.broadcast}` : ""}
                          {game.completed &&
                            ` • Final ${game.teams
                              .map((t) => `${t.abbreviation} ${t.score}`)
                              .join(" - ")}`}
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
                            <span className="stake-league">{p.league}</span>
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
                            <span className="stake-league">{p.league}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {game.rootFor.length === 0 && game.rootAgainst.length === 0 && (
                      <div className="no-stake">No stake in this one.</div>
                    )}
                  </div>
                ))}
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

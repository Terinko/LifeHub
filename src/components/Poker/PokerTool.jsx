/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import { MyStatsCharts, GroupStatsCharts } from "./PokerStatsCharts";
import "./PokerTool.css";

const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

const formatGameAge = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
const isStaleGame = (dateStr) =>
  Date.now() - new Date(dateStr).getTime() > 24 * 60 * 60 * 1000;

const PokerTool = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("game");
  const [data, setData] = useState([]);
  const [statsData, setStatsData] = useState([]);
  const [myStatsData, setMyStatsData] = useState({ playerIds: [], games: [] });
  const [newPlayerName, setNewPlayerName] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  const [gameSetup, setGameSetup] = useState({ buyIn: 10, chips: 10000 });
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  // Holds the sk of whichever active game the settle modal is open for
  // (not the game object itself) so it always reflects the latest data —
  // there can be more than one active game now.
  const [settlingGameSk, setSettlingGameSk] = useState(null);

  const [saveToHistory, setSaveToHistory] = useState(true);
  const [includeInStats, setIncludeInStats] = useState(true);
  const [settlementResults, setSettlementResults] = useState(null);

  const getAuthHeaders = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    loadProfileAndData();
  }, []);

  const loadProfileAndData = async () => {
    try {
      const headers = await getAuthHeaders();

      const profileRes = await fetch(`${API_BASE}/admin/users?me=true`, {
        headers,
      });
      const profile = await profileRes.json();
      setUserProfile(profile);

      const dataRes = await fetch(`${API_BASE}/poker`, { headers });
      const items = await dataRes.json();
      setData(Array.isArray(items) ? items : []);

      const myStatsRes = await fetch(`${API_BASE}/poker/mystats`, {
        headers,
      });
      const myStatsJson = await myStatsRes.json();
      setMyStatsData(
        myStatsJson && Array.isArray(myStatsJson.games)
          ? myStatsJson
          : { playerIds: [], games: [] },
      );

      const hasStatsAccess =
        profile.role === "ADMIN" || profile.permissions?.pokerStats;
      if (hasStatsAccess) {
        const statsRes = await fetch(`${API_BASE}/poker/stats`, { headers });
        const sItems = await statsRes.json();
        setStatsData(Array.isArray(sItems) ? sItems : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const players = data.filter((d) => d.sk?.startsWith("PLAYER#"));
  const games = data.filter((d) => d.sk?.startsWith("GAME#"));
  const activeGames = games.filter((g) => g.status === "ACTIVE");
  const settlingGame = activeGames.find((g) => g.sk === settlingGameSk) || null;
  // Someone can only be seated at one table at a time — used both to grey
  // out the roster delete button and to keep a player out of a second
  // game's "Select Players" list while their other game is still running.
  const playersInActiveGames = new Set(
    activeGames.flatMap((g) => Object.keys(g.players || {})),
  );
  const pastGames = games
    .filter((g) => g.status === "COMPLETED")
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const hasStats =
    userProfile?.role === "ADMIN" ||
    userProfile?.permissions?.pokerStats === true;

  const addPlayer = async (e) => {
    e.preventDefault();
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) return;

    const isDuplicate = players.some(
      (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (isDuplicate) {
      const proceed = window.confirm(
        `"${trimmedName}" is already on the roster. Add another player with the same name? (Only do this if they're actually a different person — stats are tracked separately per roster entry.)`,
      );
      if (!proceed) return;
    }

    try {
      const res = await fetch(`${API_BASE}/poker`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ pk: "PLAYER", name: trimmedName }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Backend Error: ${err.error || res.statusText}`);
        return; // Stop here, don't clear the box
      }

      setNewPlayerName("");
      loadProfileAndData();
    } catch (err) {
      alert(`Network Error: ${err.message}`);
    }
  };

  const claimPlayer = async (playerId) => {
    try {
      const res = await fetch(`${API_BASE}/poker`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: "CLAIM_PLAYER", playerId }),
      });
      if (!res.ok) {
        alert("Failed to claim that player. Try again.");
        return;
      }
      loadProfileAndData();
    } catch (e) {
      alert("Failed to claim that player. Try again.");
    }
  };

  const unclaimPlayer = async () => {
    try {
      const res = await fetch(`${API_BASE}/poker`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: "UNCLAIM_PLAYER" }),
      });
      if (!res.ok) {
        alert("Failed to update that. Try again.");
        return;
      }
      loadProfileAndData();
    } catch (e) {
      alert("Failed to update that. Try again.");
    }
  };

  const renamePlayer = async (player) => {
    const input = window.prompt("Rename player:", player.name);
    if (input === null) return; // cancelled
    const trimmed = input.trim();
    if (!trimmed) return;
    // Note: even re-confirming the same spelling still calls the backend —
    // that's deliberate, since it's also how you'd re-trigger a name
    // backfill across past games after the fact.

    const isDuplicate = players.some(
      (p) =>
        p.sk !== player.sk &&
        p.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      const proceed = window.confirm(
        `"${trimmed}" is already on the roster. Rename anyway? (Only do this if they're actually a different person.)`,
      );
      if (!proceed) return;
    }

    try {
      const res = await fetch(`${API_BASE}/poker`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: "RENAME_PLAYER",
          playerId: player.sk,
          name: trimmed,
        }),
      });
      if (!res.ok) {
        alert("Failed to rename that player. Try again.");
        return;
      }
      loadProfileAndData();
    } catch (e) {
      alert("Failed to rename that player. Try again.");
    }
  };

  const deletePlayer = async (player) => {
    if (
      !window.confirm(
        `Remove "${player.name}" from the roster? Past game history is unaffected.`,
      )
    )
      return;
    try {
      const res = await fetch(
        `${API_BASE}/poker/${encodeURIComponent(player.sk)}`,
        { method: "DELETE", headers: await getAuthHeaders() },
      );
      if (!res.ok) {
        alert("Failed to remove that player. Try again.");
        return;
      }
      loadProfileAndData();
    } catch (e) {
      alert("Failed to remove that player. Try again.");
    }
  };

  const startGame = async () => {
    if (selectedPlayers.length < 2) return alert("Select at least 2 players");

    if (activeGames.length > 0) {
      const proceed = window.confirm(
        `There ${activeGames.length === 1 ? "is" : "are"} already ${activeGames.length} active game${activeGames.length === 1 ? "" : "s"} running. Start another one anyway?`,
      );
      if (!proceed) return;
    }

    const initialPlayers = {};
    selectedPlayers.forEach((id) => {
      initialPlayers[id] = {
        name: players.find((p) => p.sk === id).name,
        buyIns: 1,
        finalChips: null,
      };
    });

    await fetch(`${API_BASE}/poker`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        pk: "GAME",
        status: "ACTIVE",
        buyInAmount: gameSetup.buyIn,
        chipsPerBuyIn: gameSetup.chips,
        players: initialPlayers,
        date: new Date().toISOString(),
      }),
    });
    loadProfileAndData();
  };

  // Buy-ins and final chips are persisted as small, atomic per-field
  // updates on the backend (not a full-item overwrite), so two people
  // adjusting the same or different players at the same time — even in
  // different concurrent games — can't silently clobber each other. Local
  // state is updated immutably so we never mutate the shared game.players
  // object in place. Every one of these takes the specific game it applies
  // to, since more than one can be active at once.
  const updateBuyIn = async (game, playerId, delta) => {
    const gameSk = game.sk;
    const newBuyIns = Math.max(1, game.players[playerId].buyIns + delta);

    setData((prev) =>
      prev.map((item) =>
        item.sk === gameSk
          ? {
              ...item,
              players: {
                ...item.players,
                [playerId]: { ...item.players[playerId], buyIns: newBuyIns },
              },
            }
          : item,
      ),
    );

    try {
      const res = await fetch(`${API_BASE}/poker`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: "UPDATE_BUYIN",
          gameSk,
          playerId,
          delta,
        }),
      });
      if (!res.ok) {
        alert("Failed to save that buy-in change — reloading to make sure you're seeing the real numbers.");
        loadProfileAndData();
      }
    } catch (e) {
      alert("Failed to save that buy-in change — reloading to make sure you're seeing the real numbers.");
      loadProfileAndData();
    }
  };

  const updateFinalChips = (game, playerId, chips) => {
    const gameSk = game.sk;
    const numChips = chips === "" ? null : Number(chips);
    setData((prev) =>
      prev.map((item) =>
        item.sk === gameSk
          ? {
              ...item,
              players: {
                ...item.players,
                [playerId]: { ...item.players[playerId], finalChips: numChips },
              },
            }
          : item,
      ),
    );
  };

  const persistFinalChips = async (game, playerId, chips) => {
    try {
      const res = await fetch(`${API_BASE}/poker`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: "UPDATE_FINAL_CHIPS",
          gameSk: game.sk,
          playerId,
          finalChips: chips === "" ? null : Number(chips),
        }),
      });
      if (!res.ok) console.error("Failed to save final chips");
    } catch (e) {
      console.error("Failed to save final chips", e);
    }
  };

  const endGame = async () => {
    const res = await fetch(`${API_BASE}/poker`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        action: "END_GAME",
        game: settlingGame,
        saveToHistory,
        includeInStats,
      }),
    });
    const result = await res.json();

    if (!res.ok) {
      alert(result.error || "Failed to end the game. Try again.");
      return;
    }

    if (!saveToHistory) {
      // Nothing gets saved anywhere else, so this modal is the only place
      // these numbers will ever be shown — keep it open with the results.
      setSettlementResults(result.settlements || []);
    } else {
      setSettlingGameSk(null);
    }
    // Reset for next time — otherwise a "just calculate, don't save" game
    // leaves these unchecked for the next real game too.
    setSaveToHistory(true);
    setIncludeInStats(true);
    loadProfileAndData();
  };

  const cancelGame = async (game) => {
    if (
      !window.confirm(
        "Cancel this game? Nothing will be saved and this can't be undone.",
      )
    )
      return;
    try {
      const res = await fetch(
        `${API_BASE}/poker/${encodeURIComponent(game.sk)}`,
        { method: "DELETE", headers: await getAuthHeaders() },
      );
      if (!res.ok) {
        alert("Failed to cancel the game. Try again.");
        return;
      }
      loadProfileAndData();
    } catch (e) {
      alert("Failed to cancel the game. Try again.");
    }
  };

  const deletePastGame = async (game) => {
    if (
      !window.confirm(
        `Delete this game from history (${new Date(game.date).toLocaleDateString()})? This can't be undone.`,
      )
    )
      return;
    try {
      const res = await fetch(
        `${API_BASE}/poker/${encodeURIComponent(game.sk)}`,
        { method: "DELETE", headers: await getAuthHeaders() },
      );
      if (!res.ok) {
        alert("Failed to delete that game. Try again.");
        return;
      }
      loadProfileAndData();
    } catch (e) {
      alert("Failed to delete that game. Try again.");
    }
  };

  const closeSettlementModal = () => {
    setSettlingGameSk(null);
    setSettlementResults(null);
  };

  const getFunStats = () => {
    if (statsData.length === 0) return null;

    const stats = {};
    let houdini = { name: "-", val: 0 };
    let tiltMaster = { name: "-", val: 0 };
    let roiKing = { name: "-", val: -Infinity };

    // Keyed by player id, not name — two different roster entries that
    // happen to share a display name (a typo'd duplicate, or two different
    // friends with the same first name) must not get merged into one bucket.
    statsData.forEach((g) => {
      Object.entries(g.players).forEach(([id, p]) => {
        if (!stats[id]) {
          stats[id] = {
            name: p.name,
            net: 0,
            buyIns: 0,
            games: 0,
            maxWin: -Infinity,
            maxLoss: Infinity,
          };
        }

        stats[id].name = p.name; // keep the most recent name on record
        stats[id].net += p.net;
        stats[id].buyIns += p.buyIns;
        stats[id].games += 1;
        if (p.net > stats[id].maxWin) stats[id].maxWin = p.net;
        if (p.net < stats[id].maxLoss) stats[id].maxLoss = p.net;

        if (p.net > 0 && p.buyIns > houdini.val)
          houdini = { name: p.name, val: p.buyIns };
        if (p.buyIns > tiltMaster.val)
          tiltMaster = { name: p.name, val: p.buyIns };
        if (p.buyIns === 1 && p.net > roiKing.val)
          roiKing = { name: p.name, val: p.net };
      });
    });

    const playersList = Object.values(stats).map((p) => ({
      ...p,
      variance:
        p.maxWin !== -Infinity && p.maxLoss !== Infinity
          ? p.maxWin - p.maxLoss
          : 0,
      absNet: Math.abs(p.net),
    }));

    if (playersList.length === 0) return null;

    const rollercoaster = [...playersList].sort(
      (a, b) => b.variance - a.variance,
    )[0];
    const swissBank = [...playersList].sort((a, b) => a.absNet - b.absNet)[0];
    const ironMan = [...playersList].sort((a, b) => b.games - a.games)[0];

    return { houdini, tiltMaster, roiKing, rollercoaster, swissBank, ironMan };
  };

  const funStats = getFunStats();

  const getMyStats = () => {
    const { playerIds = [], games: myGames = [] } = myStatsData;
    if (playerIds.length === 0) return { linked: false };
    if (myGames.length === 0) return { linked: true, gamesPlayed: 0 };

    const sorted = [...myGames].sort(
      (a, b) => new Date(a.completedAt) - new Date(b.completedAt),
    );

    let netTotal = 0;
    let buyInsTotal = 0;
    let gamesPlayed = 0;
    let wins = 0;
    let biggestWin = -Infinity;
    let biggestLoss = Infinity;
    let bestStreak = 0;
    let worstStreak = 0;
    let curStreak = 0;

    sorted.forEach((g) => {
      const entry = Object.entries(g.players || {}).find(([id]) =>
        playerIds.includes(id),
      );
      if (!entry) return;
      const p = entry[1];

      gamesPlayed += 1;
      netTotal += p.net;
      buyInsTotal += p.buyIns;
      if (p.net > biggestWin) biggestWin = p.net;
      if (p.net < biggestLoss) biggestLoss = p.net;

      if (p.net > 0) {
        wins += 1;
        curStreak = curStreak > 0 ? curStreak + 1 : 1;
      } else if (p.net < 0) {
        curStreak = curStreak < 0 ? curStreak - 1 : -1;
      } else {
        curStreak = 0;
      }
      if (curStreak > bestStreak) bestStreak = curStreak;
      if (curStreak < worstStreak) worstStreak = curStreak;
    });

    return {
      linked: true,
      gamesPlayed,
      netTotal,
      buyInsTotal,
      winRate: gamesPlayed ? (wins / gamesPlayed) * 100 : 0,
      biggestWin: biggestWin === -Infinity ? 0 : biggestWin,
      biggestLoss: biggestLoss === Infinity ? 0 : biggestLoss,
      avgNet: gamesPlayed ? netTotal / gamesPlayed : 0,
      bestStreak,
      worstStreak: Math.abs(worstStreak),
      currentStreak: curStreak,
    };
  };

  const myStats = getMyStats();

  return (
    <div className="view tool-view">
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>Poker</h2>
        <div style={{ width: "36px" }}></div>
      </header>

      <div className="ios-segmented-control">
        <button
          className={`segmented-btn ${activeTab === "roster" ? "active" : ""}`}
          onClick={() => setActiveTab("roster")}
        >
          Roster
        </button>
        <button
          className={`segmented-btn ${activeTab === "game" ? "active" : ""}`}
          onClick={() => setActiveTab("game")}
        >
          Game
        </button>
        <button
          className={`segmented-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
        <button
          className={`segmented-btn ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => setActiveTab("stats")}
        >
          Stats
        </button>
      </div>

      <div className="tool-content">
        {activeTab === "roster" && (
          <div className="list-container">
            {players.map((p) => {
              const isMine = myStatsData.playerIds?.includes(p.sk);
              const hasClaim = (myStatsData.playerIds?.length || 0) > 0;
              const inActiveGame = playersInActiveGames.has(p.sk);
              return (
                <div
                  key={p.sk}
                  className="kitchen-list-item"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span className="kitchen-item-name">{p.name}</span>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    {(isMine || !hasClaim) && (
                      <button
                        className="ios-submit-btn"
                        style={{
                          padding: "3px 8px",
                          fontSize: "11px",
                          background: isMine ? "#2e7d32" : "#888",
                        }}
                        onClick={() =>
                          isMine ? unclaimPlayer() : claimPlayer(p.sk)
                        }
                      >
                        {isMine ? "✓ Me" : "This is me"}
                      </button>
                    )}
                    <button
                      className="ios-submit-btn"
                      title="Rename"
                      style={{
                        padding: "3px 8px",
                        fontSize: "11px",
                        background: "#888",
                      }}
                      onClick={() => renamePlayer(p)}
                    >
                      ✎
                    </button>
                    <button
                      className="ios-submit-btn"
                      disabled={inActiveGame}
                      title={
                        inActiveGame
                          ? "Can't remove — currently in an active game"
                          : "Remove from roster"
                      }
                      style={{
                        padding: "3px 8px",
                        fontSize: "11px",
                        background: "#e64848",
                        opacity: inActiveGame ? 0.4 : 1,
                        cursor: inActiveGame ? "not-allowed" : "pointer",
                      }}
                      onClick={() => !inActiveGame && deletePlayer(p)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
            <form
              onSubmit={addPlayer}
              className="add-grocery-form"
              style={{ marginTop: "20px" }}
            >
              <input
                className="ios-input-modal item-input"
                placeholder="New Player Name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
              />
              <button type="submit" className="ios-submit-btn inline-add-btn">
                Add
              </button>
            </form>
          </div>
        )}

        {activeTab === "game" && (
          <div className="list-container">
            {activeGames.map((game) => {
              const participantNames = Object.values(game.players)
                .map((p) => p.name)
                .join(", ");
              const stale = isStaleGame(game.date);
              return (
                <div
                  key={game.sk}
                  className="recipe-card"
                  style={{
                    marginBottom: "16px",
                    border: stale ? "2px solid #e8a33d" : undefined,
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <h3 style={{ margin: 0 }}>
                      ${game.buyInAmount} Buy-in
                    </h3>
                    <small style={{ color: "#888" }}>{participantNames}</small>
                    <div
                      style={{
                        fontSize: "12px",
                        color: stale ? "#e8a33d" : "#aaa",
                        marginTop: "2px",
                        fontWeight: stale ? "600" : "400",
                      }}
                    >
                      Started {formatGameAge(game.date)}
                      {stale ? " — looks abandoned? Consider cancelling it." : ""}
                    </div>
                  </div>
                  {Object.entries(game.players).map(([id, p]) => (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderTop: "1px solid #eee",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "600" }}>{p.name}</div>
                        <small style={{ color: "#888" }}>
                          {p.buyIns} Buy-in(s) = ${p.buyIns * game.buyInAmount}
                        </small>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          className="ios-submit-btn"
                          style={{ background: "#e64848", padding: "8px 12px" }}
                          onClick={() => updateBuyIn(game, id, -1)}
                        >
                          -1
                        </button>
                        <button
                          className="ios-submit-btn"
                          style={{ padding: "8px 16px" }}
                          onClick={() => updateBuyIn(game, id, 1)}
                        >
                          + Buy-in
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setSettlingGameSk(game.sk)}
                    className="ios-submit-btn full-width"
                    style={{ marginTop: "20px", background: "#3a3d36" }}
                  >
                    End Game & Settle
                  </button>
                  <button
                    onClick={() => cancelGame(game)}
                    style={{
                      marginTop: "10px",
                      background: "none",
                      border: "none",
                      color: "#e64848",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      width: "100%",
                      padding: "6px",
                    }}
                  >
                    Cancel Game (started by mistake)
                  </button>
                </div>
              );
            })}

            <h3>{activeGames.length > 0 ? "Start Another Game" : "Start New Game"}</h3>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <label>
                Buy-in ($):{" "}
                <input
                  type="number"
                  className="ios-input-modal"
                  value={gameSetup.buyIn}
                  onChange={(e) =>
                    setGameSetup({
                      ...gameSetup,
                      buyIn: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Chips per buy:{" "}
                <input
                  type="number"
                  className="ios-input-modal"
                  value={gameSetup.chips}
                  onChange={(e) =>
                    setGameSetup({
                      ...gameSetup,
                      chips: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <h4>Select Players</h4>
            {players.map((p) => {
              const busyElsewhere = playersInActiveGames.has(p.sk);
              return (
                <label
                  key={p.sk}
                  style={{
                    display: "block",
                    padding: "10px",
                    background: "#f4f4f0",
                    marginBottom: "5px",
                    borderRadius: "8px",
                    opacity: busyElsewhere ? 0.5 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={busyElsewhere}
                    checked={selectedPlayers.includes(p.sk)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedPlayers([...selectedPlayers, p.sk]);
                      else
                        setSelectedPlayers(
                          selectedPlayers.filter((id) => id !== p.sk),
                        );
                    }}
                  />{" "}
                  {p.name}
                  {busyElsewhere ? " (already in another active game)" : ""}
                </label>
              );
            })}
            <button
              onClick={startGame}
              className="ios-submit-btn full-width"
              style={{ marginTop: "20px" }}
            >
              Start Game
            </button>
          </div>
        )}

        {activeTab === "history" && (
          <div className="list-container">
            <h3 style={{ margin: "10px 0" }}>Past Games</h3>
            {pastGames.length === 0 && (
              <p style={{ color: "#888", textAlign: "center" }}>
                No games played yet!
              </p>
            )}
            {pastGames.map((g) => (
              <div key={g.sk} className="recipe-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <h4 style={{ margin: 0 }}>
                    {new Date(g.date).toLocaleDateString()} - ${g.buyInAmount}{" "}
                    Buy-in
                  </h4>
                  <button
                    onClick={() => deletePastGame(g)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#e64848",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
                {g.settlements &&
                  g.settlements.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "6px",
                        background: "#f4f4f0",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        fontSize: "14px",
                      }}
                    >
                      <strong>{s.from}</strong> pays <strong>{s.to}</strong> $
                      {s.amount.toFixed(2)}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === "stats" && (
          <div className="list-container">
            {!myStats.linked && (
              <p style={{ color: "#888", textAlign: "center" }}>
                No player linked to your account yet. Go to the Roster tab
                and tap &quot;This is Me&quot; next to your name to start
                tracking your personal stats.
              </p>
            )}
            {myStats.linked && myStats.gamesPlayed === 0 && (
              <p style={{ color: "#888", textAlign: "center" }}>
                No completed games yet. Play a game to see your stats here!
              </p>
            )}
            {myStats.linked && myStats.gamesPlayed > 0 && (
              <>
              <div
                className="recipe-card"
                style={{ background: "#f8f9fa", border: "2px solid #e1e4e8" }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    textAlign: "center",
                    borderBottom: "1px solid #ddd",
                    paddingBottom: "10px",
                  }}
                >
                  📊 My Poker Career
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginTop: "16px",
                  }}
                >
                  <div
                    style={{
                      padding: "12px",
                      background: "#fff",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: myStats.netTotal >= 0 ? "green" : "#e64848",
                      }}
                    >
                      {myStats.netTotal >= 0 ? "+" : "-"}$
                      {Math.abs(myStats.netTotal).toFixed(2)}
                    </div>
                    <small style={{ color: "#888" }}>Lifetime Winnings</small>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#fff",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                      {myStats.gamesPlayed}
                    </div>
                    <small style={{ color: "#888" }}>Games Played</small>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#fff",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                      {myStats.winRate.toFixed(0)}%
                    </div>
                    <small style={{ color: "#888" }}>Win Rate</small>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#fff",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                      {myStats.buyInsTotal}
                    </div>
                    <small style={{ color: "#888" }}>Total Buy-ins</small>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#fff",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "green",
                      }}
                    >
                      +${myStats.biggestWin.toFixed(2)}
                    </div>
                    <small style={{ color: "#888" }}>Best Night</small>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#fff",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#e64848",
                      }}
                    >
                      -${Math.abs(myStats.biggestLoss).toFixed(2)}
                    </div>
                    <small style={{ color: "#888" }}>Worst Night</small>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#fff",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: myStats.avgNet >= 0 ? "green" : "#e64848",
                      }}
                    >
                      {myStats.avgNet >= 0 ? "+" : "-"}$
                      {Math.abs(myStats.avgNet).toFixed(2)}
                    </div>
                    <small style={{ color: "#888" }}>Avg Net / Game</small>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#fff",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                      🔥 {myStats.bestStreak}
                    </div>
                    <small style={{ color: "#888" }}>
                      Best Winning Streak
                    </small>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    background: "#fff",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                    {myStats.currentStreak > 0 &&
                      `🔥 On a ${myStats.currentStreak}-game winning streak!`}
                    {myStats.currentStreak < 0 &&
                      `❄️ On a ${Math.abs(myStats.currentStreak)}-game losing streak`}
                    {myStats.currentStreak === 0 && "No active streak"}
                  </div>
                </div>
              </div>

              <MyStatsCharts
                games={myStatsData.games}
                playerIds={myStatsData.playerIds}
              />
              </>
            )}

            {hasStats &&
              (funStats ? (
              <>
              <div
                className="recipe-card"
                style={{ background: "#f8f9fa", border: "2px solid #e1e4e8" }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    textAlign: "center",
                    borderBottom: "1px solid #ddd",
                    paddingBottom: "10px",
                  }}
                >
                  🏆 Hall of Fame
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    marginTop: "12px",
                    fontSize: "15px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <span>
                      🎩 <strong>The Houdini:</strong>{" "}
                      {funStats.houdini?.val > 0
                        ? funStats.houdini.name
                        : "N/A"}{" "}
                      <br />
                      <small style={{ color: "#888", fontSize: "12px" }}>
                        Most buy-ins in a night while still profiting
                      </small>
                    </span>
                    <span style={{ fontWeight: "bold" }}>
                      {funStats.houdini?.val > 0
                        ? `${funStats.houdini.val} buy-ins`
                        : "-"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <span>
                      💸 <strong>The Tilt Master:</strong>{" "}
                      {funStats.tiltMaster?.val > 0
                        ? funStats.tiltMaster.name
                        : "N/A"}{" "}
                      <br />
                      <small style={{ color: "#888", fontSize: "12px" }}>
                        Most buy-ins in a single night
                      </small>
                    </span>
                    <span style={{ fontWeight: "bold" }}>
                      {funStats.tiltMaster?.val > 0
                        ? `${funStats.tiltMaster.val} buy-ins`
                        : "-"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <span>
                      📈 <strong>The ROI King:</strong>{" "}
                      {funStats.roiKing?.val !== -Infinity
                        ? funStats.roiKing.name
                        : "N/A"}{" "}
                      <br />
                      <small style={{ color: "#888", fontSize: "12px" }}>
                        Biggest profit off exactly one buy-in
                      </small>
                    </span>
                    <span style={{ color: "green", fontWeight: "bold" }}>
                      {funStats.roiKing?.val !== -Infinity
                        ? `+$${funStats.roiKing.val.toFixed(2)}`
                        : "-"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <span>
                      🎢 <strong>The Rollercoaster:</strong>{" "}
                      {funStats.rollercoaster?.name || "N/A"} <br />
                      <small style={{ color: "#888", fontSize: "12px" }}>
                        Biggest gap between best and worst night
                      </small>
                    </span>
                    <span style={{ fontWeight: "bold" }}>
                      ${funStats.rollercoaster?.variance?.toFixed(2) || "0.00"}{" "}
                      gap
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <span>
                      ⚖️ <strong>The Swiss Bank:</strong>{" "}
                      {funStats.swissBank?.name || "N/A"} <br />
                      <small style={{ color: "#888", fontSize: "12px" }}>
                        Lifetime net closest to $0.00
                      </small>
                    </span>
                    <span style={{ fontWeight: "bold" }}>
                      ${funStats.swissBank?.net?.toFixed(2) || "0.00"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <span>
                      📅 <strong>The Iron Man:</strong>{" "}
                      {funStats.ironMan?.name || "N/A"} <br />
                      <small style={{ color: "#888", fontSize: "12px" }}>
                        Most total games played
                      </small>
                    </span>
                    <span style={{ fontWeight: "bold" }}>
                      {funStats.ironMan?.games || 0} games
                    </span>
                  </div>
                </div>
              </div>
              <GroupStatsCharts statsData={statsData} />
              </>
            ) : (
              <p style={{ color: "#888", textAlign: "center" }}>
                No qualifying stats yet!
              </p>
            ))}
          </div>
        )}
      </div>

      {(settlingGameSk || settlementResults) && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              {settlementResults ? "Settle Up" : "Enter Final Chips"}{" "}
              <button className="ios-modal-close" onClick={closeSettlementModal}>
                ✕
              </button>
            </div>
            {settlementResults ? (
              <div className="ios-modal-content">
                <div
                  style={{
                    fontSize: "13px",
                    color: "#888",
                    marginBottom: "16px",
                  }}
                >
                  Not saved to history — this is the only place you'll see
                  these numbers, so settle up now.
                </div>

                {settlementResults.length === 0 && (
                  <p style={{ color: "#888", textAlign: "center" }}>
                    Everyone broke even — nobody owes anything.
                  </p>
                )}

                {settlementResults.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px",
                      background: "#f4f4f0",
                      borderRadius: "8px",
                      marginBottom: "8px",
                      fontSize: "15px",
                    }}
                  >
                    <strong>{s.from}</strong> pays <strong>{s.to}</strong> $
                    {s.amount.toFixed(2)}
                  </div>
                ))}

                <button
                  onClick={closeSettlementModal}
                  className="ios-submit-btn full-width"
                  style={{ marginTop: "16px" }}
                >
                  Done
                </button>
              </div>
            ) : !settlingGame ? (
              <div className="ios-modal-content">
                <p style={{ color: "#888", textAlign: "center" }}>
                  This game isn't active anymore — it may have already been
                  settled elsewhere.
                </p>
                <button
                  onClick={closeSettlementModal}
                  className="ios-submit-btn full-width"
                  style={{ marginTop: "16px" }}
                >
                  Close
                </button>
              </div>
            ) : (
            <div className="ios-modal-content">
              {Object.entries(settlingGame.players).map(([id, p]) => (
                <div
                  key={id}
                  style={{
                    marginBottom: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{p.name}</span>
                  <input
                    type="number"
                    className="ios-input-modal"
                    style={{ width: "120px", margin: 0 }}
                    placeholder="Final chips"
                    value={p.finalChips ?? ""}
                    onChange={(e) => updateFinalChips(settlingGame, id, e.target.value)}
                    onBlur={(e) => persistFinalChips(settlingGame, id, e.target.value)}
                  />
                </div>
              ))}

              <div
                style={{
                  marginTop: "20px",
                  padding: "12px",
                  background: "#f4f4f0",
                  borderRadius: "8px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontWeight: "600",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={saveToHistory}
                    onChange={(e) => setSaveToHistory(e.target.checked)}
                  />
                  Save game to history
                </label>

                {hasStats && saveToHistory && (
                  <>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontWeight: "600",
                        marginTop: "12px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={includeInStats}
                        onChange={(e) => setIncludeInStats(e.target.checked)}
                      />
                      Include in Stats Leaderboard
                    </label>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#888",
                        marginTop: "4px",
                        marginLeft: "24px",
                      }}
                    >
                      This only controls the shared Hall of Fame — it'll count
                      toward everyone's own personal stats either way.
                    </div>
                  </>
                )}

                {!saveToHistory && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      marginTop: "8px",
                      marginLeft: "24px",
                    }}
                  >
                    Uncheck to just work out the Venmo payouts without recording
                    anything.
                  </div>
                )}
              </div>

              <button
                onClick={endGame}
                className="ios-submit-btn full-width"
                style={{ marginTop: "20px" }}
              >
                Calculate Settlements
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerTool;

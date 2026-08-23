/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth"; // <-- ADDED AUTH IMPORT
import "./PokerTool.css";

const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

const PokerTool = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("game");
  const [data, setData] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState("");

  const [gameSetup, setGameSetup] = useState({ buyIn: 10, chips: 10000 });
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [settlementModal, setSettlementModal] = useState(false);

  // --- NEW AUTH HELPER ---
  const getAuthHeaders = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch(`${API_BASE}/poker`, {
        headers: await getAuthHeaders(), // <-- SECURED
      });
      const items = await res.json();
      setData(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error(e);
    }
  };

  const players = data.filter((d) => d.pk === "PLAYER");
  const games = data.filter((d) => d.pk === "GAME");
  const activeGame = games.find((g) => g.status === "ACTIVE");
  const pastGames = games
    .filter((g) => g.status === "COMPLETED")
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName) return;
    await fetch(`${API_BASE}/poker`, {
      method: "POST",
      headers: await getAuthHeaders(), // <-- SECURED
      body: JSON.stringify({ pk: "PLAYER", name: newPlayerName }),
    });
    setNewPlayerName("");
    loadData();
  };

  const startGame = async () => {
    if (selectedPlayers.length < 2) return alert("Select at least 2 players");

    const initialPlayers = {};
    selectedPlayers.forEach((id) => {
      initialPlayers[id] = {
        name: players.find((p) => p.sk === id).name,
        buyIns: 1,
        finalChips: 0,
      };
    });

    await fetch(`${API_BASE}/poker`, {
      method: "POST",
      headers: await getAuthHeaders(), // <-- SECURED
      body: JSON.stringify({
        pk: "GAME",
        status: "ACTIVE",
        buyInAmount: gameSetup.buyIn,
        chipsPerBuyIn: gameSetup.chips,
        players: initialPlayers,
        date: new Date().toISOString(),
      }),
    });
    loadData();
  };

  const updateBuyIn = async (playerId, delta) => {
    const updatedGame = { ...activeGame };
    updatedGame.players[playerId].buyIns = Math.max(
      1,
      updatedGame.players[playerId].buyIns + delta,
    );

    setData((prev) =>
      prev.map((item) => (item.sk === updatedGame.sk ? updatedGame : item)),
    );

    await fetch(`${API_BASE}/poker`, {
      method: "POST",
      headers: await getAuthHeaders(), // <-- SECURED
      body: JSON.stringify(updatedGame),
    });
  };

  const updateFinalChips = (playerId, chips) => {
    const updatedGame = { ...activeGame };
    updatedGame.players[playerId].finalChips = Number(chips);
    setData((prev) =>
      prev.map((item) => (item.sk === updatedGame.sk ? updatedGame : item)),
    );
  };

  const endGame = async () => {
    await fetch(`${API_BASE}/poker`, {
      method: "POST",
      headers: await getAuthHeaders(), // <-- SECURED
      body: JSON.stringify({ action: "END_GAME", game: activeGame }),
    });
    setSettlementModal(false);
    loadData();
  };

  const getFunStats = () => {
    if (pastGames.length === 0) return null;

    const stats = {};
    let houdini = { name: "-", val: 0 };
    let tiltMaster = { name: "-", val: 0 };
    let roiKing = { name: "-", val: -Infinity };

    pastGames.forEach((g) => {
      Object.values(g.players).forEach((p) => {
        if (!stats[p.name]) {
          stats[p.name] = {
            name: p.name,
            net: 0,
            buyIns: 0,
            games: 0,
            maxWin: -Infinity,
            maxLoss: Infinity,
          };
        }

        stats[p.name].net += p.net;
        stats[p.name].buyIns += p.buyIns;
        stats[p.name].games += 1;
        if (p.net > stats[p.name].maxWin) stats[p.name].maxWin = p.net;
        if (p.net < stats[p.name].maxLoss) stats[p.name].maxLoss = p.net;

        if (p.net > 0 && p.buyIns > houdini.val) {
          houdini = { name: p.name, val: p.buyIns };
        }
        if (p.buyIns > tiltMaster.val) {
          tiltMaster = { name: p.name, val: p.buyIns };
        }
        if (p.buyIns === 1 && p.net > roiKing.val) {
          roiKing = { name: p.name, val: p.net };
        }
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
      </div>

      <div className="tool-content">
        {activeTab === "roster" && (
          <div className="list-container">
            {players.map((p) => (
              <div key={p.sk} className="kitchen-list-item">
                <span className="kitchen-item-name">{p.name}</span>
              </div>
            ))}
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

        {activeTab === "game" && !activeGame && (
          <div className="list-container">
            <h3>Start New Game</h3>
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
            {players.map((p) => (
              <label
                key={p.sk}
                style={{
                  display: "block",
                  padding: "10px",
                  background: "#f4f4f0",
                  marginBottom: "5px",
                  borderRadius: "8px",
                }}
              >
                <input
                  type="checkbox"
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
              </label>
            ))}
            <button
              onClick={startGame}
              className="ios-submit-btn full-width"
              style={{ marginTop: "20px" }}
            >
              Start Game
            </button>
          </div>
        )}

        {activeTab === "game" && activeGame && (
          <div className="list-container">
            <h3 style={{ marginBottom: "16px" }}>
              Active Game (${activeGame.buyInAmount} Buy-in)
            </h3>
            {Object.entries(activeGame.players).map(([id, p]) => (
              <div
                key={id}
                className="recipe-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h4 style={{ margin: 0 }}>{p.name}</h4>
                  <small style={{ color: "#888" }}>
                    {p.buyIns} Buy-in(s) = ${p.buyIns * activeGame.buyInAmount}
                  </small>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="ios-submit-btn"
                    style={{ background: "#e64848", padding: "8px 12px" }}
                    onClick={() => updateBuyIn(id, -1)}
                  >
                    -1
                  </button>
                  <button
                    className="ios-submit-btn"
                    style={{ padding: "8px 16px" }}
                    onClick={() => updateBuyIn(id, 1)}
                  >
                    + Buy-in
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setSettlementModal(true)}
              className="ios-submit-btn full-width"
              style={{ marginTop: "20px", background: "#3a3d36" }}
            >
              End Game & Settle
            </button>
          </div>
        )}

        {activeTab === "history" && (
          <div className="list-container">
            {funStats && (
              <div
                className="recipe-card"
                style={{
                  background: "#f8f9fa",
                  border: "2px solid #e1e4e8",
                  marginBottom: "16px",
                }}
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
            )}

            <h3 style={{ margin: "10px 0" }}>Past Games</h3>
            {pastGames.length === 0 && (
              <p style={{ color: "#888", textAlign: "center" }}>
                No games played yet!
              </p>
            )}
            {pastGames.map((g) => (
              <div key={g.sk} className="recipe-card">
                <h4 style={{ margin: "0 0 10px 0" }}>
                  {new Date(g.date).toLocaleDateString()} - ${g.buyInAmount}{" "}
                  Buy-in
                </h4>
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
      </div>

      {settlementModal && activeGame && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              Enter Final Chips{" "}
              <button
                className="ios-modal-close"
                onClick={() => setSettlementModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
              {Object.entries(activeGame.players).map(([id, p]) => (
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
                    value={p.finalChips || ""}
                    onChange={(e) => updateFinalChips(id, e.target.value)}
                  />
                </div>
              ))}
              <button
                onClick={endGame}
                className="ios-submit-btn full-width"
                style={{ marginTop: "20px" }}
              >
                Calculate Settlements
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerTool;

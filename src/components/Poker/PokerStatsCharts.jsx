import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const currency = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;

const cardStyle = {
  background: "#f8f9fa",
  border: "2px solid #e1e4e8",
  marginBottom: "16px",
};

// Deep-dive charts for the signed-in user's own games: a bankroll-over-time
// line, a per-game win/loss bar chart, and a head-to-head breakdown built
// from each game's settlements (who they've won the most from / lost the
// most to, keyed by opponent id so a shared display name never collides).
export const MyStatsCharts = ({ games, playerIds }) => {
  if (!games?.length || !playerIds?.length) return null;

  const sorted = [...games].sort(
    (a, b) => new Date(a.completedAt) - new Date(b.completedAt),
  );

  let cumulative = 0;
  const chartData = [];
  const headToHead = {};

  sorted.forEach((g, i) => {
    const entry = Object.entries(g.players || {}).find(([id]) =>
      playerIds.includes(id),
    );
    if (!entry) return;
    const [myId, me] = entry;
    cumulative += me.net;
    chartData.push({
      game: i + 1,
      net: Math.round(me.net * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
    });

    (g.settlements || []).forEach((s) => {
      if (s.fromId === myId) {
        if (!headToHead[s.toId]) headToHead[s.toId] = { name: s.to, won: 0, lost: 0 };
        headToHead[s.toId].name = s.to;
        headToHead[s.toId].lost += s.amount;
      } else if (s.toId === myId) {
        if (!headToHead[s.fromId]) headToHead[s.fromId] = { name: s.from, won: 0, lost: 0 };
        headToHead[s.fromId].name = s.from;
        headToHead[s.fromId].won += s.amount;
      }
    });
  });

  const headToHeadList = Object.entries(headToHead)
    .map(([id, h]) => ({ id, ...h, net: Math.round((h.won - h.lost) * 100) / 100 }))
    .sort((a, b) => b.net - a.net);

  if (chartData.length === 0) return null;

  return (
    <div style={{ marginTop: "16px" }}>
      <div className="recipe-card" style={cardStyle}>
        <h4 style={{ marginTop: 0 }}>📈 Bankroll Over Time</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="game"
              tick={{ fontSize: 11 }}
              label={{ value: "Game #", position: "insideBottom", offset: -3, fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => currency(v)} labelFormatter={(v) => `Game ${v}`} />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#2e7d32"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Cumulative Net"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="recipe-card" style={cardStyle}>
        <h4 style={{ marginTop: 0 }}>📊 Per-Game Results</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="game" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => currency(v)} labelFormatter={(v) => `Game ${v}`} />
            <Bar dataKey="net">
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.net >= 0 ? "#2e7d32" : "#e64848"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {headToHeadList.length > 0 && (
        <div className="recipe-card" style={cardStyle}>
          <h4 style={{ marginTop: 0 }}>🤝 Head-to-Head</h4>
          {headToHeadList.map((h) => (
            <div
              key={h.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid #eee",
                fontSize: "14px",
              }}
            >
              <span>{h.name}</span>
              <span style={{ fontWeight: "bold", color: h.net >= 0 ? "green" : "#e64848" }}>
                {h.net >= 0 ? "+" : ""}
                {currency(h.net)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Group-wide deep dive: a full sortable leaderboard (not just superlatives),
// a ranked net-winnings bar chart, and a games-per-month activity chart.
export const GroupStatsCharts = ({ statsData }) => {
  if (!statsData?.length) return null;

  const stats = {};
  statsData.forEach((g) => {
    Object.entries(g.players || {}).forEach(([id, p]) => {
      if (!stats[id]) {
        stats[id] = { id, name: p.name, net: 0, buyIns: 0, games: 0, wins: 0 };
      }
      stats[id].name = p.name;
      stats[id].net += p.net;
      stats[id].buyIns += p.buyIns;
      stats[id].games += 1;
      if (p.net > 0) stats[id].wins += 1;
    });
  });

  const leaderboard = Object.values(stats)
    .map((p) => ({
      ...p,
      net: Math.round(p.net * 100) / 100,
      winRate: p.games ? Math.round((p.wins / p.games) * 100) : 0,
      avgNet: p.games ? Math.round((p.net / p.games) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.net - a.net);

  const monthlyMap = {};
  statsData.forEach((g) => {
    const d = new Date(g.completedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  const activityData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [y, m] = key.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString([], {
        year: "2-digit",
        month: "short",
      });
      return { month: label, count };
    });

  return (
    <div style={{ marginTop: "16px" }}>
      <div className="recipe-card" style={cardStyle}>
        <h4 style={{ marginTop: 0 }}>🏅 Leaderboard</h4>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                <th style={{ padding: "6px" }}>Player</th>
                <th style={{ padding: "6px", textAlign: "right" }}>Net</th>
                <th style={{ padding: "6px", textAlign: "right" }}>Games</th>
                <th style={{ padding: "6px", textAlign: "right" }}>Buy-ins</th>
                <th style={{ padding: "6px", textAlign: "right" }}>Win %</th>
                <th style={{ padding: "6px", textAlign: "right" }}>Avg/Game</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px", fontWeight: "600" }}>{p.name}</td>
                  <td
                    style={{
                      padding: "6px",
                      textAlign: "right",
                      color: p.net >= 0 ? "green" : "#e64848",
                      fontWeight: "bold",
                    }}
                  >
                    {p.net >= 0 ? "+" : ""}${p.net.toFixed(2)}
                  </td>
                  <td style={{ padding: "6px", textAlign: "right" }}>{p.games}</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>{p.buyIns}</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>{p.winRate}%</td>
                  <td
                    style={{
                      padding: "6px",
                      textAlign: "right",
                      color: p.avgNet >= 0 ? "green" : "#e64848",
                    }}
                  >
                    {p.avgNet >= 0 ? "+" : ""}${p.avgNet.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="recipe-card" style={cardStyle}>
        <h4 style={{ marginTop: 0 }}>💰 Net Winnings by Player</h4>
        <ResponsiveContainer width="100%" height={Math.max(200, leaderboard.length * 36)}>
          <BarChart
            data={leaderboard}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
            <Bar dataKey="net">
              {leaderboard.map((p) => (
                <Cell key={p.id} fill={p.net >= 0 ? "#2e7d32" : "#e64848"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {activityData.length > 1 && (
        <div className="recipe-card" style={cardStyle}>
          <h4 style={{ marginTop: 0 }}>📅 Games Per Month</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={activityData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3a3d36" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

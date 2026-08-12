import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import "./App.css";

// Existing API configuration
const API_BASE = "https://irobpmcv4k.execute-api.us-east-2.amazonaws.com/prod";

// A Helper component for icons (simplified using emojis for now, scalable)
const NavIcon = ({ emoji, label }) => (
  <div className="nav-icon-wrapper">
    <span className="nav-emoji">{emoji}</span>
    <span className="nav-label">{label}</span>
  </div>
);

// --- Component: Primary Navigation Bar ---
const NavBar = () => (
  <nav className="bottom-nav">
    <NavLink
      to="/"
      className={({ isActive }) => (isActive ? "active-nav" : "")}
    >
      <NavIcon emoji="📊" label="Dashboard" />
    </NavLink>
    <NavLink
      to="/add"
      className={({ isActive }) => (isActive ? "active-nav" : "")}
    >
      <NavIcon emoji="➕" label="Add Bill" />
    </NavLink>
    <NavLink to="/notes" className="disabled-nav">
      <NavIcon emoji="📝" label="Notes" />
    </NavLink>
    <NavLink to="/profile" className="disabled-nav">
      <NavIcon emoji="⚙️" label="Settings" />
    </NavLink>
  </nav>
);

// --- Component: Main Dashboard View ---
const Dashboard = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBills = async () => {
    setLoading(true);
    const response = await fetch(`${API_BASE}/bills`);
    const data = await response.json();
    setBills(data);
    setLoading(false);
  };

  const handleDelete = async (billId) => {
    // Optimistic Update
    setBills(bills.filter((bill) => bill.billId !== billId));
    try {
      await fetch(`${API_BASE}/bills?billId=${billId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete bill:", error);
      loadBills(); // Revert
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBills();
  }, []);

  // Calculate Summary Data
  const totalDue = bills.reduce((sum, b) => sum + b.amount, 0).toFixed(2);
  const nextBill = bills[0]; // Simplified sorting for now

  return (
    <div className="view dashboard-view">
      <header className="hub-header">
        <h1>LifeHub Dashboard</h1>
        <p>Your centralized life toolset.</p>
      </header>

      {/* Visual Summary Card */}
      <section className="summary-widget">
        <div className="stat-card total-due">
          <label>Total Bills Due</label>
          <span className="stat-value">${totalDue}</span>
        </div>
        {nextBill && (
          <div className="stat-card next-bill">
            <label>Next Up</label>
            <span className="stat-value">
              {nextBill.name} (${nextBill.amount})
            </span>
            <span className="stat-label">Due Day {nextBill.dueDayOfMonth}</span>
          </div>
        )}
      </section>

      {/* Improved Bills List */}
      <section className="bills-container">
        <h2>Bills Overview</h2>
        {loading ? (
          <p className="loading-state">Syncing data...</p>
        ) : (
          <div className="bill-list">
            {bills.length === 0 && (
              <p className="empty-state">No bills found.</p>
            )}
            {bills.map((bill) => (
              <div key={bill.billId} className="bill-card new-aesthetic">
                <div className="card-header">
                  <strong>{bill.name}</strong>
                  <span className="due-badge">Day {bill.dueDayOfMonth}</span>
                </div>
                <div className="card-body">
                  <span>${bill.amount}</span>
                  <span className="payee-info">to {bill.payeeName}</span>
                </div>
                <button
                  onClick={() => handleDelete(bill.billId)}
                  className="delete-btn minimal"
                  aria-label="Delete bill"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// --- Component: Add Bill View ---
const AddBill = () => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [dueDayOfMonth, setDueDayOfMonth] = useState("");
  const [status, setStatus] = useState("");

  const handleAddBill = async (e) => {
    e.preventDefault();
    if (!name || !amount || !payeeName || !dueDayOfMonth) {
      setStatus("❌ Please fill all fields.");
      return;
    }

    try {
      setStatus("⏳ Submitting...");
      const response = await fetch(`${API_BASE}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount: Number(amount),
          payeeName,
          dueDayOfMonth: Number(dueDayOfMonth),
          isSplit: false,
        }),
      });
      if (response.ok) {
        setStatus("✅ Bill added! Reloading dashboard...");
        // Clear fields
        setName("");
        setAmount("");
        setPayeeName("");
        setDueDayOfMonth("");
      } else {
        setStatus("❌ API Error.");
      }
    } catch {
      setStatus("❌ Sync failed.");
    }
  };

  return (
    <div className="view add-bill-view">
      <header className="hub-header">
        <h1>Add New Bill</h1>
        <p>Register a new recurring expense.</p>
      </header>

      <form onSubmit={handleAddBill} className="add-bill-form modern">
        <input
          placeholder="Bill name (e.g., Rent)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Amount ($)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
        />
        <input
          placeholder="Payee (e.g., Landlord)"
          value={payeeName}
          onChange={(e) => setPayeeName(e.target.value)}
        />
        <input
          placeholder="Due day (1-31)"
          value={dueDayOfMonth}
          onChange={(e) => setDueDayOfMonth(e.target.value)}
          type="number"
        />
        <button type="submit">Submit Bill</button>
        {status && <p className="form-status">{status}</p>}
      </form>
    </div>
  );
};

// --- Root Component with Routing ---
function App() {
  return (
    <BrowserRouter>
      <div className="app hub-layout">
        {/* Main Content Area */}
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddBill />} />
            <Route path="*" element={<div>Placeholder/Not Found</div>} />
          </Routes>
        </main>

        {/* Persistent Bottom Nav */}
        <NavBar />
      </div>
    </BrowserRouter>
  );
}

export default App;

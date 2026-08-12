import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import "./App.css";

const API_BASE = "https://irobpmcv4k.execute-api.us-east-2.amazonaws.com";

// --- Component: Home Launchpad ---
const HomeHub = () => {
  return (
    <div className="view launchpad-view">
      <header className="ios-header-large">
        <h1>LifeHub</h1>
      </header>

      <div className="tool-grid">
        <Link to="/bills" className="tool-card">
          <div className="tool-icon" style={{ background: "#34C759" }}>
            💸
          </div>
          <span className="tool-name">Bills</span>
        </Link>

        {/* Placeholders for future tools */}
        <div className="tool-card disabled">
          <div className="tool-icon" style={{ background: "#007AFF" }}>
            ✓
          </div>
          <span className="tool-name">To-Do</span>
        </div>
        <div className="tool-card disabled">
          <div className="tool-icon" style={{ background: "#FFCC00" }}>
            📝
          </div>
          <span className="tool-name">Notes</span>
        </div>
      </div>
    </div>
  );
};

// --- Component: Bills Tool ---
const BillsTool = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [dueDayOfMonth, setDueDayOfMonth] = useState("");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(""); // Format: YYYY-MM

  const loadBills = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/bills`);
      const data = await response.json();
      setBills(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBills();
  }, []);

  const handleAddBill = async (e) => {
    e.preventDefault();

    // 1. Check for missing fields
    if (!name || !amount || !payeeName || !dueDayOfMonth) {
      alert(
        "Please fill out all 4 required fields (Name, Amount, Payee, Due Day).",
      );
      return;
    }

    // 2. Check if checkbox is checked but no date is selected
    if (hasEndDate && !endDate) {
      alert("Please select a specific End Month, or uncheck the box.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount: Number(amount),
          payeeName,
          dueDayOfMonth: Number(dueDayOfMonth),
          // Clean up the date string to just YYYY-MM in case the browser adds days
          endDate: hasEndDate ? endDate.substring(0, 7) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      // Success! Clear the form and reload
      setName("");
      setAmount("");
      setPayeeName("");
      setDueDayOfMonth("");
      setHasEndDate(false);
      setEndDate("");
      loadBills();
    } catch (error) {
      console.error(error);
      alert(
        "Error saving bill! Check the terminal or browser console. Details: " +
          error.message,
      );
    }
  };

  const handleDelete = async (billId) => {
    setBills(bills.filter((bill) => bill.billId !== billId));
    try {
      await fetch(`${API_BASE}/bills?billId=${billId}`, { method: "DELETE" });
    } catch {
      loadBills();
    }
  };

  // --- SMART SORTING ENGINE ---
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const processedBills = bills
    .filter((bill) => {
      // 1. Hide bills if their end date was last month (or earlier)
      if (bill.endDate && bill.endDate < currentMonthStr) return false;
      return true;
    })
    .sort((a, b) => {
      // 2. Figure out if the bill is due later this month, or next month
      const aIsNextMonth = a.dueDayOfMonth < currentDay ? 1 : 0;
      const bIsNextMonth = b.dueDayOfMonth < currentDay ? 1 : 0;

      // 3. Put this month's bills at the top, next month's at the bottom
      if (aIsNextMonth !== bIsNextMonth) {
        return aIsNextMonth - bIsNextMonth;
      }
      // 4. Sort numerically by day
      return a.dueDayOfMonth - b.dueDayOfMonth;
    });
  // -----------------------------

  return (
    <div className="view tool-view">
      {/* iOS Style Navigation Bar */}
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>Bills</h2>
        <div className="nav-right-placeholder"></div>
      </header>

      <div className="tool-content">
        {/* iOS Style List */}
        <div className="ios-list-group">
          {loading ? (
            <div className="ios-list-item">
              <p>Loading...</p>
            </div>
          ) : processedBills.length === 0 ? (
            <div className="ios-list-item">
              <p className="text-secondary">No bills setup.</p>
            </div>
          ) : (
            processedBills.map((bill) => (
              <div key={bill.billId} className="ios-list-item">
                <div className="item-details">
                  <strong>{bill.name}</strong>
                  <span className="text-secondary">
                    ${bill.amount} to {bill.payeeName}
                  </span>
                </div>
                <div className="item-right">
                  <span className="due-text">Day {bill.dueDayOfMonth}</span>
                  <button
                    onClick={() => handleDelete(bill.billId)}
                    className="ios-delete-btn"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Form */}
        <h3 className="section-title">Add New Bill</h3>
        <form onSubmit={handleAddBill} className="ios-form-group">
          <input
            placeholder="Name (e.g., Rent)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Amount ($)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            placeholder="Payee"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
          />
          <input
            placeholder="Due Day (1-31)"
            type="number"
            value={dueDayOfMonth}
            onChange={(e) => setDueDayOfMonth(e.target.value)}
          />

          {/* --- NEW END DATE LOGIC --- */}
          <div
            className="ios-list-item"
            style={{ borderBottom: "none", fontSize: "15px" }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "var(--ios-text-sec)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={hasEndDate}
                onChange={(e) => setHasEndDate(e.target.checked)}
                style={{ width: "auto", border: "none" }}
              />
              Bill ends on a specific month?
            </label>
          </div>
          {hasEndDate && (
            <input
              placeholder="End Month (e.g., 2027-05)"
              type={endDate ? "month" : "text"}
              onFocus={(e) => (e.target.type = "month")}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = "text";
              }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          )}
          {/* --------------------------- */}

          <button type="submit" className="ios-submit-btn">
            Add Bill
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Root Component ---
function App() {
  return (
    <BrowserRouter>
      <div className="app ios-layout">
        <Routes>
          <Route path="/" element={<HomeHub />} />
          <Route path="/bills" element={<BillsTool />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

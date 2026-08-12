/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import "./App.css";
const API_BASE = "https://mf9hv7qfi9.execute-api.us-east-1.amazonaws.com/prod";

function App() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [dueDayOfMonth, setDueDayOfMonth] = useState("");

  const loadBills = async () => {
    setLoading(true);
    const response = await fetch(`${API_BASE}/bills`);
    const data = await response.json();
    setBills(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handleAddBill = async (e) => {
    e.preventDefault();
    if (!name || !amount || !payeeName || !dueDayOfMonth) return;

    await fetch(`${API_BASE}/bills`, {
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

    setName("");
    setAmount("");
    setPayeeName("");
    setDueDayOfMonth("");
    loadBills();
  };

  return (
    <div className="app">
      <h1>LifeHub</h1>
      <h2>Rent & Utilities</h2>

      <form onSubmit={handleAddBill} className="add-bill-form">
        <input
          placeholder="Bill name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          placeholder="Pay to"
          value={payeeName}
          onChange={(e) => setPayeeName(e.target.value)}
        />
        <input
          placeholder="Due day (1-31)"
          value={dueDayOfMonth}
          onChange={(e) => setDueDayOfMonth(e.target.value)}
        />
        <button type="submit">Add Bill</button>
      </form>

      {loading ? (
        <p>Loading bills...</p>
      ) : (
        <div className="bill-list">
          {bills.length === 0 && <p>No bills yet.</p>}
          {bills.map((bill) => (
            <div key={bill.billId} className="bill-card">
              <strong>{bill.name}</strong>
              <span>
                ${bill.amount} to {bill.payeeName}
              </span>
              <span>Due day {bill.dueDayOfMonth}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;

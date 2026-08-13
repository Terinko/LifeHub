/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import "./App.css";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

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

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  // Add Form State
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [dueDayOfMonth, setDueDayOfMonth] = useState("");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [isShared, setIsShared] = useState(false);

  // Calendar Navigation & Selection State
  const today = new Date();
  const [viewedYear, setViewedYear] = useState(today.getFullYear());
  const [viewedMonthIndex, setViewedMonthIndex] = useState(today.getMonth());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);

  const viewedMonthKey = `${viewedYear}-${String(viewedMonthIndex + 1).padStart(2, "0")}`;

  const handlePrevMonth = () => {
    setSelectedCalendarDay(null);
    if (viewedMonthIndex === 0) {
      setViewedMonthIndex(11);
      setViewedYear(viewedYear - 1);
    } else {
      setViewedMonthIndex(viewedMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedCalendarDay(null);
    if (viewedMonthIndex === 11) {
      setViewedMonthIndex(0);
      setViewedYear(viewedYear + 1);
    } else {
      setViewedMonthIndex(viewedMonthIndex + 1);
    }
  };

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
    loadBills();
  }, []);

  const handleAddBill = async (e) => {
    e.preventDefault();
    if (!name || !amount || !payeeName || !dueDayOfMonth) {
      alert("Please fill out all required fields.");
      return;
    }

    try {
      await fetch(`${API_BASE}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount: Number(amount),
          payeeName,
          dueDayOfMonth: Number(dueDayOfMonth),
          endDate: hasEndDate ? endDate.substring(0, 7) : null,
          statusHistory: {},
          notes: "",
          isShared: isShared,
          // NEW: Initializing with paidHistory instead of hasPaid
          payers: isShared
            ? [
                {
                  id: window.crypto.randomUUID(),
                  name: "Person 1",
                  paidHistory: {},
                },
              ]
            : [],
        }),
      });

      setName("");
      setAmount("");
      setPayeeName("");
      setDueDayOfMonth("");
      setHasEndDate(false);
      setEndDate("");
      setIsShared(false);
      setIsAddModalOpen(false);
      loadBills();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (billId) => {
    setBills(bills.filter((b) => b.billId !== billId));
    try {
      await fetch(`${API_BASE}/bills?billId=${billId}`, { method: "DELETE" });
    } catch {
      loadBills();
    }
  };

  const handleToggleStatus = async (bill) => {
    const history = bill.statusHistory || {};
    const currentStatus = history[viewedMonthKey] || "UNPAID";

    let nextStatus = "UNPAID";
    if (currentStatus === "UNPAID") nextStatus = "PAID";
    else if (currentStatus === "PAID") nextStatus = "SETTLED";

    const updatedHistory = { ...history, [viewedMonthKey]: nextStatus };
    const updatedBill = { ...bill, statusHistory: updatedHistory };

    setBills(bills.map((b) => (b.billId === bill.billId ? updatedBill : b)));

    try {
      await fetch(`${API_BASE}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedBill),
      });
    } catch (error) {
      console.error("Failed to update status", error);
      loadBills();
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedBill) return;

    setBills(
      bills.map((b) => (b.billId === selectedBill.billId ? selectedBill : b)),
    );

    try {
      await fetch(`${API_BASE}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedBill),
      });
      setSelectedBill(null);
    } catch (error) {
      console.error("Failed to save details", error);
      alert("Error saving details.");
    }
  };

  const currentDay = today.getDate();
  const currentRealMonth = today.getMonth();
  const currentRealYear = today.getFullYear();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysInViewedMonth = new Date(
    viewedYear,
    viewedMonthIndex + 1,
    0,
  ).getDate();
  const firstDayIndex = new Date(viewedYear, viewedMonthIndex, 1).getDay();

  const getDaysUntil = (dueDay) => {
    let daysLeft = dueDay - currentDay;
    if (daysLeft < 0) daysLeft += daysInViewedMonth;
    return daysLeft;
  };

  const calendarMap = {};

  const activeBillsForView = bills.filter((bill) => {
    if (bill.endDate) {
      const billEndDate = new Date(bill.endDate + "-01");
      const viewedDate = new Date(viewedYear, viewedMonthIndex, 1);
      if (viewedDate > billEndDate) return false;
    }
    return true;
  });

  activeBillsForView.forEach((bill) => {
    const day = bill.dueDayOfMonth;
    if (!calendarMap[day]) calendarMap[day] = [];

    const history = bill.statusHistory || {};
    const monthStatus = history[viewedMonthKey] || "UNPAID";
    calendarMap[day].push({ ...bill, currentMonthStatus: monthStatus });
  });

  const actionNeeded = [];
  const waitingOnParents = [];
  const settled = [];

  activeBillsForView.forEach((bill) => {
    const history = bill.statusHistory || {};
    const monthStatus = history[viewedMonthKey] || "UNPAID";

    const daysLeft = getDaysUntil(bill.dueDayOfMonth);
    const enrichedBill = { ...bill, currentMonthStatus: monthStatus, daysLeft };

    if (monthStatus === "SETTLED") {
      settled.push(enrichedBill);
    } else if (monthStatus === "PAID") {
      waitingOnParents.push(enrichedBill);
    } else {
      actionNeeded.push(enrichedBill);
    }
  });

  actionNeeded.sort((a, b) => a.daysLeft - b.daysLeft);

  const renderCard = (bill) => {
    const status = bill.currentMonthStatus || "UNPAID";

    return (
      <div key={bill.billId} className="bill-card-wrapper">
        <div className="bill-card">
          <div
            className="bill-card-content"
            onClick={() => {
              setSelectedBill({
                ...bill,
                notes: bill.notes || "",
                // NEW: Ensure payers array has paidHistory objects safely initialized
                payers: (bill.payers || []).map((p) => ({
                  ...p,
                  paidHistory: p.paidHistory || {},
                })),
                isShared: bill.isShared || false,
                statusHistory: bill.statusHistory || {},
              });
            }}
          >
            <div className="bill-card-header">
              <div className="bill-card-info">
                <span className="bill-title">{bill.name}</span>
                <span className="bill-meta">
                  ${bill.amount} to {bill.payeeName}
                </span>
                {status === "UNPAID" && bill.daysLeft <= 5 ? (
                  <span className="urgency-badge">
                    Due in {bill.daysLeft} days (Day {bill.dueDayOfMonth})
                  </span>
                ) : status === "UNPAID" ? (
                  <span className="bill-meta">Due in {bill.daysLeft} days</span>
                ) : status === "PAID" ? (
                  <span className="bill-meta">Waiting on repayment</span>
                ) : (
                  <span className="bill-meta">
                    Settled for {monthNames[viewedMonthIndex]}
                  </span>
                )}

                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "var(--ios-blue)",
                  }}
                >
                  {bill.isShared && <span>👥 Split Bill &nbsp;</span>}
                  {bill.notes && <span>📝 Notes</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bill-card-actions">
            <button
              onClick={() => handleDelete(bill.billId)}
              className="ios-delete-btn"
              style={{ fontSize: "15px" }}
            >
              Delete
            </button>
            <button
              onClick={() => handleToggleStatus(bill)}
              className={`status-btn status-${status.toLowerCase()}`}
            >
              {status === "UNPAID"
                ? "Unpaid"
                : status === "PAID"
                  ? "Pending"
                  : "Done"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="view tool-view">
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>Bills</h2>
        <button onClick={() => setIsAddModalOpen(true)} className="ios-add-btn">
          +
        </button>
      </header>

      <div className="tool-content" style={{ padding: "0 0 20px 0" }}>
        {/* --- MINI CALENDAR VIEW --- */}
        <div className="calendar-container">
          <div
            className="calendar-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              onClick={handlePrevMonth}
              style={{
                background: "none",
                border: "none",
                color: "var(--ios-blue)",
                fontSize: "17px",
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              ‹
            </button>
            <span>
              {monthNames[viewedMonthIndex]} {viewedYear}
            </span>
            <button
              onClick={handleNextMonth}
              style={{
                background: "none",
                border: "none",
                color: "var(--ios-blue)",
                fontSize: "17px",
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              ›
            </button>
          </div>
          <div className="calendar-grid">
            <span className="calendar-day-name">Su</span>
            <span className="calendar-day-name">Mo</span>
            <span className="calendar-day-name">Tu</span>
            <span className="calendar-day-name">We</span>
            <span className="calendar-day-name">Th</span>
            <span className="calendar-day-name">Fr</span>
            <span className="calendar-day-name">Sa</span>

            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-cell empty"></div>
            ))}

            {Array.from({ length: daysInViewedMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayBills = calendarMap[dayNum] || [];
              const statuses = dayBills.map((b) => b.currentMonthStatus);
              const hasUnpaid = statuses.some(
                (s) => s === "UNPAID" || s === "PAID",
              );
              const hasPaid =
                statuses.length > 0 && statuses.every((s) => s === "SETTLED");
              const isToday =
                dayNum === currentDay &&
                viewedMonthIndex === currentRealMonth &&
                viewedYear === currentRealYear;
              const isSelected = selectedCalendarDay === dayNum;

              return (
                <div
                  key={`day-${dayNum}`}
                  className="calendar-cell"
                  onClick={() =>
                    setSelectedCalendarDay(isSelected ? null : dayNum)
                  }
                  style={{
                    fontWeight: isToday ? "700" : "400",
                    border: isSelected
                      ? "2px solid var(--ios-blue)"
                      : isToday
                        ? "1px solid var(--ios-blue)"
                        : "none",
                    cursor: dayBills.length > 0 ? "pointer" : "default",
                  }}
                >
                  <span>{dayNum}</span>
                  <div className="dot-indicator-container">
                    {statuses.length > 0 && (
                      <span
                        className={`cal-dot ${hasPaid && !hasUnpaid ? "green" : "red"}`}
                      ></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedCalendarDay && (
            <div
              style={{
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "0.5px solid var(--ios-border)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--ios-text-sec)",
                  marginBottom: "8px",
                }}
              >
                Bills on {monthNames[viewedMonthIndex]} {selectedCalendarDay}:
              </div>
              {(calendarMap[selectedCalendarDay] || []).length === 0 ? (
                <div style={{ fontSize: "14px", color: "var(--ios-text-sec)" }}>
                  No bills due on this day.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {(calendarMap[selectedCalendarDay] || []).map((bill) => (
                    <div
                      key={bill.billId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--ios-bg)",
                        padding: "8px 12px",
                        borderRadius: "8px",
                      }}
                    >
                      <span style={{ fontSize: "15px", fontWeight: "500" }}>
                        {bill.name} (${bill.amount})
                      </span>
                      <button
                        onClick={() => handleToggleStatus(bill)}
                        className={`status-btn status-${bill.currentMonthStatus.toLowerCase()}`}
                        style={{
                          fontSize: "12px",
                          padding: "4px 10px",
                          width: "90px",
                        }}
                      >
                        {bill.currentMonthStatus === "UNPAID"
                          ? "Unpaid"
                          : bill.currentMonthStatus === "PAID"
                            ? "Pending"
                            : "Done"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- LISTS --- */}
        <h3 className="group-header">
          Action Needed ({monthNames[viewedMonthIndex]})
        </h3>
        <div className="bill-card-container">
          {actionNeeded.length === 0 ? (
            <p className="text-secondary" style={{ marginLeft: "16px" }}>
              All caught up for this month!
            </p>
          ) : (
            actionNeeded.map(renderCard)
          )}
        </div>

        {waitingOnParents.length > 0 && (
          <>
            <h3 className="group-header">Waiting on Repayment</h3>
            <div className="bill-card-container">
              {waitingOnParents.map(renderCard)}
            </div>
          </>
        )}

        {settled.length > 0 && (
          <>
            <h3 className="group-header">Settled</h3>
            <div className="bill-card-container" style={{ opacity: 0.6 }}>
              {settled.map(renderCard)}
            </div>
          </>
        )}
      </div>

      {/* --- ADD BILL MODAL --- */}
      {isAddModalOpen && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              Add New Bill
              <button
                className="ios-modal-close"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
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

                <div
                  className="ios-list-item"
                  style={{
                    borderBottom: "none",
                    fontSize: "15px",
                    borderTop: "0.5px solid var(--ios-border)",
                  }}
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
                      checked={isShared}
                      onChange={(e) => setIsShared(e.target.checked)}
                      style={{ width: "auto", border: "none" }}
                    />
                    Paying this for other people?
                  </label>
                </div>

                <button type="submit" className="ios-submit-btn">
                  Save Bill
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- BILL DETAILS MODAL --- */}
      {selectedBill && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              {selectedBill.name} Details
              <button
                className="ios-modal-close"
                onClick={() => setSelectedBill(null)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
              <h4 className="section-title" style={{ margin: "0 0 4px 0" }}>
                Notes
              </h4>
              <textarea
                className="ios-textarea"
                placeholder="Login info, confirmation numbers, etc."
                value={selectedBill.notes}
                onChange={(e) =>
                  setSelectedBill({ ...selectedBill, notes: e.target.value })
                }
              />

              {selectedBill.isShared && (
                <>
                  <h4
                    className="section-title"
                    style={{ margin: "20px 0 4px 0" }}
                  >
                    Who Owes You For {monthNames[viewedMonthIndex]}?
                  </h4>
                  <div className="payer-list">
                    {selectedBill.payers.map((payer) => (
                      <div key={payer.id} className="payer-row">
                        <input
                          type="checkbox"
                          className="payer-checkbox"
                          // NEW: Safely checks the month-specific boolean flag
                          checked={!!payer.paidHistory?.[viewedMonthKey]}
                          onChange={(e) => {
                            const updatedPayers = selectedBill.payers.map(
                              (p) =>
                                p.id === payer.id
                                  ? {
                                      ...p,
                                      paidHistory: {
                                        ...p.paidHistory,
                                        [viewedMonthKey]: e.target.checked,
                                      },
                                    }
                                  : p,
                            );
                            setSelectedBill({
                              ...selectedBill,
                              payers: updatedPayers,
                            });
                          }}
                        />
                        <input
                          type="text"
                          className="payer-input"
                          placeholder="Name"
                          value={payer.name}
                          onChange={(e) => {
                            const updatedPayers = selectedBill.payers.map(
                              (p) =>
                                p.id === payer.id
                                  ? { ...p, name: e.target.value }
                                  : p,
                            );
                            setSelectedBill({
                              ...selectedBill,
                              payers: updatedPayers,
                            });
                          }}
                        />
                        <button
                          className="payer-remove-btn"
                          onClick={() => {
                            const updatedPayers = selectedBill.payers.filter(
                              (p) => p.id !== payer.id,
                            );
                            setSelectedBill({
                              ...selectedBill,
                              payers: updatedPayers,
                            });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <button
                      className="add-payer-btn"
                      onClick={() => {
                        // NEW: Initializes new payer with empty paidHistory dictionary
                        const newPayer = {
                          id: window.crypto.randomUUID(),
                          name: "",
                          paidHistory: {},
                        };
                        setSelectedBill({
                          ...selectedBill,
                          payers: [...selectedBill.payers, newPayer],
                        });
                      }}
                    >
                      + Add Person
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={handleSaveDetails}
                className="ios-submit-btn"
                style={{
                  marginTop: "24px",
                  borderRadius: "8px",
                  background: "var(--ios-blue)",
                  color: "white",
                }}
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}
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

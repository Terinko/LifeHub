import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import "./ApplicationTracker.css";

const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

const STATUSES = [
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
];

const STALE_DAYS = 14;

// Module-scope on purpose (react-hooks/purity) — same pattern as
// PokerTool's formatGameAge/isStaleGame.
const formatAge = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

const isStale = (dateStr) =>
  Date.now() - new Date(dateStr).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000;

const emptyForm = {
  sk: null,
  company: "",
  position: "",
  location: "",
  status: "Applied",
  dateApplied: new Date().toISOString().slice(0, 10),
  url: "",
  source: "",
  salaryRange: "",
  contact: "",
  notes: "",
  createdAt: null,
};

const ApplicationTracker = () => {
  const navigate = useNavigate();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [applications, setApplications] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = async () => {
    const session = await fetchAuthSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.tokens.idToken.toString()}`,
    };
  };

  const loadData = async () => {
    try {
      const res = await fetch(`${API_BASE}/applications`, {
        headers: await getAuthHeaders(),
      });
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/users?me=true`, {
          headers: await getAuthHeaders(),
        });
        const profile = await res.json();
        if (profile?.role !== "ADMIN") {
          navigate("/");
          return;
        }
        setCheckingAccess(false);
        loadData();
      } catch (e) {
        console.error(e);
        navigate("/");
      }
    };
    checkAccessAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (app) => {
    setForm({ ...emptyForm, ...app });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.company.trim() || !form.position.trim()) {
      return alert("Company and position are required.");
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/applications`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();
      setApplications((prev) => [
        ...prev.filter((a) => a.sk !== saved.sk),
        saved,
      ]);
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save this application.");
    }
    setSaving(false);
  };

  const handleDelete = async (app) => {
    if (!window.confirm(`Delete the ${app.company} application?`)) return;
    setApplications((prev) => prev.filter((a) => a.sk !== app.sk));
    try {
      await fetch(`${API_BASE}/applications/${app.sk}`, {
        method: "DELETE",
        headers: await getAuthHeaders(),
      });
    } catch (e) {
      console.error(e);
      loadData(); // restore on failure
    }
  };

  const handleStatusChange = async (app, status) => {
    const prevStatus = app.status;
    const now = new Date().toISOString();
    // Optimistic — this is the board's main interaction, it should feel instant.
    setApplications((prev) =>
      prev.map((a) =>
        a.sk === app.sk ? { ...a, status, updatedAt: now } : a,
      ),
    );
    try {
      const res = await fetch(`${API_BASE}/applications`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: "UPDATE_STATUS", sk: app.sk, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch (e) {
      console.error(e);
      setApplications((prev) =>
        prev.map((a) =>
          a.sk === app.sk ? { ...a, status: prevStatus } : a,
        ),
      );
      alert("Failed to move this application. Please try again.");
    }
  };

  if (checkingAccess) {
    return (
      <div className="view tool-view">
        <header className="ios-nav-bar">
          <h2>Loading...</h2>
        </header>
      </div>
    );
  }

  return (
    <div className="view tool-view">
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>Applications</h2>
        <button className="ios-add-btn" onClick={openNew}>
          +
        </button>
      </header>

      <div className="app-board">
        {STATUSES.map((status) => {
          const columnApps = applications.filter((a) => a.status === status);
          return (
            <div className="app-column" key={status}>
              <div className="app-column-header">
                <span>{status}</span>
                <span className="app-column-count">{columnApps.length}</span>
              </div>

              {columnApps.length === 0 ? (
                <div className="app-column-empty">No applications</div>
              ) : (
                columnApps.map((app) => {
                  const stale = isStale(app.updatedAt || app.createdAt);
                  return (
                    <div className="app-card" key={app.sk}>
                      <div className="app-card-header">
                        <div>
                          <div className="app-card-company">
                            {app.company}
                          </div>
                          <div className="app-card-position">
                            {app.position}
                          </div>
                        </div>
                        <div className="app-card-actions">
                          <button
                            className="app-icon-btn"
                            onClick={() => openEdit(app)}
                          >
                            ✎
                          </button>
                          <button
                            className="app-icon-btn delete"
                            onClick={() => handleDelete(app)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {app.location && (
                        <div className="app-card-meta">{app.location}</div>
                      )}
                      <div className="app-card-meta">
                        Applied {app.dateApplied}
                      </div>

                      {stale && (
                        <div className="app-card-stale">
                          ⏱ No update in {formatAge(app.updatedAt || app.createdAt)}
                        </div>
                      )}

                      <select
                        className="app-status-select"
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(app, e.target.value)
                        }
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            Move to {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              {form.sk ? "Edit Application" : "New Application"}
              <button
                className="ios-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content app-modal-content">
              <input
                className="ios-input-modal"
                placeholder="Company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
              <input
                className="ios-input-modal"
                placeholder="Position"
                value={form.position}
                onChange={(e) =>
                  setForm({ ...form, position: e.target.value })
                }
              />
              <input
                className="ios-input-modal"
                placeholder="Location (e.g. Remote, NYC)"
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
              />

              <div className="app-form-row">
                <select
                  className="ios-input-modal"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  className="ios-input-modal"
                  type="date"
                  value={form.dateApplied}
                  onChange={(e) =>
                    setForm({ ...form, dateApplied: e.target.value })
                  }
                />
              </div>

              <input
                className="ios-input-modal"
                placeholder="Job posting link"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />

              <div className="app-form-row">
                <input
                  className="ios-input-modal"
                  placeholder="Source (e.g. Referral, LinkedIn)"
                  value={form.source}
                  onChange={(e) =>
                    setForm({ ...form, source: e.target.value })
                  }
                />
                <input
                  className="ios-input-modal"
                  placeholder="Salary range"
                  value={form.salaryRange}
                  onChange={(e) =>
                    setForm({ ...form, salaryRange: e.target.value })
                  }
                />
              </div>

              <input
                className="ios-input-modal"
                placeholder="Contact / referral name"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />

              <textarea
                className="ios-input-modal"
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ minHeight: "80px" }}
              />

              <button
                onClick={handleSave}
                className="app-submit-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationTracker;

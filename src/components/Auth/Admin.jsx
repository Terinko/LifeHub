/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

// --- CUSTOM IOS-STYLE TOGGLE PILL ---
const TogglePill = ({ label, icon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "20px",
        border: "none",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        background: isActive ? "var(--ios-blue)" : "#E5E5EA",
        color: isActive ? "#fff" : "#8E8E93",
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePerms, setInvitePerms] = useState({
    bills: false,
    kitchen: false,
    poker: false,
  });
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: await getAuthHeaders(),
      });
      const data = await response.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setLoading(true);

    try {
      await fetch(`${API_BASE}/admin/users`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          email: inviteEmail,
          permissions: invitePerms,
        }),
      });
      setInviteEmail("");
      setInvitePerms({ bills: false, kitchen: false, poker: false });
      loadUsers();
      alert("Invite sent! They will receive a temporary password via email.");
    } catch (err) {
      alert("Failed to invite user");
    }
    setLoading(false);
  };

  const togglePermission = async (user, tool) => {
    const updatedUser = {
      ...user,
      permissions: {
        ...user.permissions,
        [tool]: !user.permissions[tool],
      },
    };

    // Optimistic UI update for instant feedback
    setUsers(users.map((u) => (u.pk === user.pk ? updatedUser : u)));

    try {
      await fetch(`${API_BASE}/admin/users`, {
        method: "PUT",
        headers: await getAuthHeaders(),
        body: JSON.stringify(updatedUser),
      });
    } catch (e) {
      console.error(e);
      loadUsers(); // Revert on failure
    }
  };

  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `Are you sure you want to completely remove ${user.email}? They will lose access immediately.`,
      )
    ) {
      return;
    }

    // Optimistic removal
    setUsers(users.filter((u) => u.pk !== user.pk));

    try {
      await fetch(`${API_BASE}/admin/users`, {
        method: "DELETE",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ pk: user.pk, email: user.email }),
      });
    } catch (e) {
      console.error(e);
      alert("Failed to delete user.");
      loadUsers(); // Restore if failed
    }
  };

  return (
    <div className="view">
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>System Admin</h2>
        <div style={{ width: "50px" }}></div>
      </header>

      <div className="tool-content" style={{ padding: "20px 16px" }}>
        {/* NEW SLEEK INVITE CARD */}
        <div
          style={{
            background: "#3A3D36",
            padding: "20px",
            borderRadius: "16px",
            marginBottom: "32px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "6px", fontSize: "18px" }}>
            Send an Invite
          </h3>
          <p
            style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#A0A0A0" }}
          >
            Grant access to your Hub.
          </p>

          <form
            onSubmit={handleInvite}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              style={{
                padding: "14px",
                borderRadius: "10px",
                border: "none",
                background: "#4C5046",
                color: "white",
                fontSize: "15px",
                outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <TogglePill
                label="Bills"
                icon="💸"
                isActive={invitePerms.bills}
                onClick={(e) => {
                  e.preventDefault();
                  setInvitePerms({ ...invitePerms, bills: !invitePerms.bills });
                }}
              />
              <TogglePill
                label="Kitchen"
                icon="🍳"
                isActive={invitePerms.kitchen}
                onClick={(e) => {
                  e.preventDefault();
                  setInvitePerms({
                    ...invitePerms,
                    kitchen: !invitePerms.kitchen,
                  });
                }}
              />
              <TogglePill
                label="Poker"
                icon="🃏"
                isActive={invitePerms.poker}
                onClick={(e) => {
                  e.preventDefault();
                  setInvitePerms({ ...invitePerms, poker: !invitePerms.poker });
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "4px",
                padding: "14px",
                borderRadius: "10px",
                border: "none",
                background: "white",
                color: "#3A3D36",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {loading ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </div>

        {/* MODERN USER ROSTER */}
        <h3
          style={{
            marginBottom: "16px",
            fontSize: "18px",
            color: "var(--ios-text)",
          }}
        >
          Active Users
        </h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            paddingBottom: "40px",
          }}
        >
          {users.map((user) => (
            <div
              key={user.pk}
              style={{
                background: "var(--ios-card)",
                padding: "16px",
                borderRadius: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "var(--ios-text)",
                    }}
                  >
                    {user.email}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--ios-text-sec)",
                      marginTop: "2px",
                    }}
                  >
                    {user.role === "ADMIN"
                      ? "System Administrator"
                      : "Guest User"}
                  </div>
                </div>
                {user.role !== "ADMIN" && (
                  <button
                    onClick={() => handleDeleteUser(user)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ios-red)",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {user.role !== "ADMIN" ? (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    borderTop: "1px solid var(--ios-border)",
                    paddingTop: "16px",
                  }}
                >
                  <TogglePill
                    label="Bills"
                    icon="💸"
                    isActive={user.permissions?.bills}
                    onClick={() => togglePermission(user, "bills")}
                  />
                  <TogglePill
                    label="Kitchen"
                    icon="🍳"
                    isActive={user.permissions?.kitchen}
                    onClick={() => togglePermission(user, "kitchen")}
                  />
                  <TogglePill
                    label="Poker"
                    icon="🃏"
                    isActive={user.permissions?.poker}
                    onClick={() => togglePermission(user, "poker")}
                  />
                </div>
              ) : (
                <div
                  style={{
                    borderTop: "1px solid var(--ios-border)",
                    paddingTop: "12px",
                    fontSize: "13px",
                    color: "var(--ios-text-sec)",
                  }}
                >
                  Has unrestricted access to all modules.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;

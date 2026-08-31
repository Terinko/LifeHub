/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, fetchAuthSession } from "aws-amplify/auth";

const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

const Hub = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/users?me=true`, {
          headers: await getAuthHeaders(),
        });
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Failed to load profile", error);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading) {
    return (
      <div className="view">
        <header className="ios-nav-bar">
          <h2>Loading...</h2>
        </header>
      </div>
    );
  }

  // Fallback to false if permissions object is missing
  const perms = profile?.permissions || {
    bills: false,
    kitchen: false,
    poker: false,
    fantasy: false,
  };
  const isAdmin = profile?.role === "ADMIN";

  return (
    <div className="view">
      <header className="ios-nav-bar">
        <button
          onClick={handleSignOut}
          className="ios-back-btn"
          style={{ fontSize: "15px", fontWeight: "400" }}
        >
          Sign Out
        </button>
        <h2>LifeHub</h2>
        <div style={{ width: "65px" }}></div>
      </header>

      <div className="tool-content" style={{ padding: "20px 16px" }}>
        {/* Only show tools the user has permission for */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          {(isAdmin || perms.bills) && (
            <div
              onClick={() => navigate("/bills")}
              className="hub-card"
              style={cardStyle}
            >
              <span style={{ fontSize: "40px" }}>💸</span>
              <span style={textStyle}>Bills</span>
            </div>
          )}

          {(isAdmin || perms.kitchen) && (
            <div
              onClick={() => navigate("/kitchen")}
              className="hub-card"
              style={cardStyle}
            >
              <span style={{ fontSize: "40px" }}>🍳</span>
              <span style={textStyle}>Kitchen</span>
            </div>
          )}

          {(isAdmin || perms.poker) && (
            <div
              onClick={() => navigate("/poker")}
              className="hub-card"
              style={cardStyle}
            >
              <span style={{ fontSize: "40px" }}>🃏</span>
              <span style={textStyle}>Poker</span>
            </div>
          )}

          {(isAdmin || perms.fantasy) && (
            <div
              onClick={() => navigate("/fantasy")}
              className="hub-card"
              style={cardStyle}
            >
              <span style={{ fontSize: "40px" }}>🏈</span>
              <span style={textStyle}>Fantasy</span>
            </div>
          )}

          {/* Admin Tools - Only visible to ADMIN role */}
          {isAdmin && (
            <div
              onClick={() => navigate("/admin")}
              className="hub-card"
              style={{ ...cardStyle, background: "#3A3D36" }}
            >
              <span style={{ fontSize: "40px" }}>🛡️</span>
              <span style={{ ...textStyle, color: "white" }}>Admin</span>
            </div>
          )}
        </div>

        {!perms.bills &&
          !perms.kitchen &&
          !perms.poker &&
          !perms.fantasy &&
          !isAdmin && (
          <div
            style={{ textAlign: "center", marginTop: "40px", color: "#888" }}
          >
            <p>You don't have access to any tools yet.</p>
            <p>Ask the admin to grant you permissions!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const cardStyle = {
  background: "var(--ios-card)",
  padding: "24px 16px",
  borderRadius: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
  cursor: "pointer",
};

const textStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "var(--ios-text)",
};

export default Hub;

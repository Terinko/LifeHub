/* eslint-disable no-unused-vars */
import React from "react";
import { useNavigate } from "react-router-dom";

const Hub = () => {
  const navigate = useNavigate();

  return (
    <div className="view">
      <header className="ios-nav-bar">
        <h2>LifeHub</h2>
      </header>

      <div className="tool-content" style={{ padding: "20px 16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          {/* Bills App Button */}
          <div
            onClick={() => navigate("/bills")}
            style={{
              background: "var(--ios-card)",
              padding: "24px 16px",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "40px" }}>💸</span>
            <span
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--ios-text)",
              }}
            >
              Bills
            </span>
          </div>

          {/* Kitchen App Button */}
          <div
            onClick={() => navigate("/kitchen")}
            style={{
              background: "var(--ios-card)",
              padding: "24px 16px",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "40px" }}>🍳</span>
            <span
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--ios-text)",
              }}
            >
              Kitchen
            </span>
          </div>

          {/* Poker App Button */}
          <div
            onClick={() => navigate("/poker")}
            style={{
              background: "var(--ios-card)",
              padding: "24px 16px",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "40px" }}>🃏</span>
            <span
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--ios-text)",
              }}
            >
              Poker
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hub;

/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, fetchAuthSession } from "aws-amplify/auth";
import { Receipt, ChefHat, Spade, Tv, ShieldCheck, Lock } from "lucide-react";
import "./Hub.css";

const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

const TOOLS = [
  {
    key: "bills",
    label: "Bills",
    subtitle: "Split & settle up",
    icon: Receipt,
    path: "/bills",
    accent: "#fdeeee",
    iconColor: "#b3554a",
  },
  {
    key: "kitchen",
    label: "Kitchen",
    subtitle: "Recipes & grocery list",
    icon: ChefHat,
    path: "/kitchen",
    accent: "#eaf1ea",
    iconColor: "#4c664d",
  },
  {
    key: "poker",
    label: "Poker",
    subtitle: "Game night ledger",
    icon: Spade,
    path: "/poker",
    accent: "#f3efe3",
    iconColor: "#8a6d1f",
  },
  {
    key: "fantasy",
    label: "Fantasy",
    subtitle: "Weekly watch-along",
    icon: Tv,
    path: "/fantasy",
    accent: "#e8eef4",
    iconColor: "#2f5f8a",
  },
];

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
      <div className="view hub-view">
        <div className="hub-header">
          <h1 className="hub-title">Loading...</h1>
        </div>
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
  const visibleTools = TOOLS.filter((t) => isAdmin || perms[t.key]);

  return (
    <div className="view hub-view">
      <div className="hub-header">
        <h1 className="hub-title">LifeHub</h1>
        <button onClick={handleSignOut} className="hub-signout-btn">
          Sign Out
        </button>
      </div>

      <div className="hub-content">
        {(visibleTools.length > 0 || isAdmin) && (
          <div className="hub-grid">
            {visibleTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.key}
                  onClick={() => navigate(tool.path)}
                  className="hub-card"
                >
                  <div className="hub-card-icon" style={{ background: tool.accent }}>
                    <Icon size={24} color={tool.iconColor} strokeWidth={1.75} />
                  </div>
                  <div className="hub-card-label">{tool.label}</div>
                  <div className="hub-card-subtitle">{tool.subtitle}</div>
                </div>
              );
            })}

            {isAdmin && (
              <div
                onClick={() => navigate("/admin")}
                className="hub-card admin-card"
              >
                <div className="hub-card-icon">
                  <ShieldCheck size={24} color="#e8ece7" strokeWidth={1.75} />
                </div>
                <div className="hub-card-label">Admin</div>
                <div className="hub-card-subtitle">Manage access</div>
              </div>
            )}
          </div>
        )}

        {visibleTools.length === 0 && !isAdmin && (
          <div className="hub-empty-state">
            <div className="hub-empty-icon">
              <Lock size={32} strokeWidth={1.5} />
            </div>
            <p>You don't have access to any tools yet</p>
            <small>Ask the admin to grant you permissions.</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default Hub;

/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { signIn, confirmSignIn } from "aws-amplify/auth"; // <-- Added confirmSignIn
import { useNavigate } from "react-router-dom";

const Login = ({ setSession }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false); // <-- Tracks if they need a new password
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
      });

      // If Cognito says "This is a temporary password, make a new one!"
      if (
        nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        setIsNewPasswordRequired(true);
        setLoading(false);
        return;
      }

      if (isSignedIn) {
        setSession(true);
        navigate("/");
        return;
      }

      // Any other/unexpected next step (MFA, custom challenge, etc.) isn't
      // handled by this form yet — surface it instead of hanging on
      // "Signing in..." forever.
      setError(
        `Unexpected sign-in step: ${nextStep?.signInStep || "unknown"}. Contact the admin.`,
      );
      setLoading(false);
    } catch (err) {
      setError(
        err.message || "Failed to sign in. Please check your credentials.",
      );
      setLoading(false);
    }
  };

  // --- NEW: Handles the forced password change ---
  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { isSignedIn } = await confirmSignIn({
        challengeResponse: newPassword,
      });

      if (isSignedIn) {
        setSession(true);
        navigate("/");
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to set new password. Ensure it has 12 chars, uppercase, lowercase, number, and symbol.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="view">
      <header className="ios-nav-bar">
        <h2>LifeHub Login</h2>
      </header>
      <div className="tool-content" style={{ padding: "20px 16px" }}>
        {!isNewPasswordRequired ? (
          // --- STANDARD LOGIN FORM ---
          <form
            onSubmit={handleLogin}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {error && (
              <div
                style={{
                  color: "#e64848",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "14px",
                  padding: "10px",
                  background: "#ffebeb",
                  borderRadius: "8px",
                }}
              >
                {error}
              </div>
            )}

            <input
              className="ios-input-modal"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="ios-input-modal"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              className="ios-submit-btn full-width"
              style={{ marginTop: "10px" }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          // --- NEW PASSWORD FORM ---
          <form
            onSubmit={handleNewPasswordSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              <h3 style={{ margin: "0 0 8px 0" }}>Welcome! 👋</h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--ios-text-sec)",
                  fontSize: "14px",
                }}
              >
                You are using a temporary password. Please set a permanent one
                to continue.
              </p>
            </div>

            {error && (
              <div
                style={{
                  color: "#e64848",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "14px",
                  padding: "10px",
                  background: "#ffebeb",
                  borderRadius: "8px",
                }}
              >
                {error}
              </div>
            )}

            <input
              className="ios-input-modal"
              type="password"
              placeholder="New Permanent Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <ul
              style={{
                fontSize: "12px",
                color: "var(--ios-text-sec)",
                margin: "0 10px",
                paddingLeft: "15px",
              }}
            >
              <li>At least 12 characters</li>
              <li>Uppercase & lowercase letters</li>
              <li>At least 1 number</li>
              <li>At least 1 symbol (e.g., !@#$)</li>
            </ul>

            <button
              type="submit"
              className="ios-submit-btn full-width"
              style={{ marginTop: "10px" }}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password & Enter Hub"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;

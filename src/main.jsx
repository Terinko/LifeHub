import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import "./index.css";
import App from "./App.jsx";

// Initialize AWS Amplify Authentication
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_fOXu4nwZv",
      userPoolClientId: "7vdugt5rd98k0pl9uqkpd2k3gk",
      // The region is usually the first part of your User Pool ID (e.g., 'us-east-1')
      userPoolIdRegion: "us-east-1",
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

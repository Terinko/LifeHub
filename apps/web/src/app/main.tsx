import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configureAmplify } from "./amplify";
import { Providers } from "./providers";
import { App } from "./App";
import "../shared/styles/tokens.css";
import "./index.css";

configureAmplify();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

createRoot(root).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);

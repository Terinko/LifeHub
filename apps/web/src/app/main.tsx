import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configureAmplify } from "./amplify";
import { Providers } from "./providers";
import "../shared/styles/tokens.css";
import "./legacy.css";
import { App } from "./App";

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

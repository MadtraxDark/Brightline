import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/500.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/source-serif-4/400.css";
import * as api from "./api.js";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { store } from "./store/store.js";
import "./styles/tailwind.css";
import "./styles/tokens.css";
import "./styles/app.css";

// The public site owns reload behavior; dashboard routes keep their history.
if (window.location.pathname === "/") {
  window.history.scrollRestoration = "manual";
  if (performance.getEntriesByType("navigation")[0]?.type === "reload") {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
}

if (import.meta.env.DEV) {
  window.__brightline = { store, api };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);

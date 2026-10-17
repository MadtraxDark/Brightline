import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/500.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/source-serif-4/400.css";
import LandingPage from "./LandingPage.jsx";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/landing.css";

const App = lazy(() => import("./App.jsx"));
const isDashboard = window.location.pathname.replace(/\/+$/, "") === "/app";

// Disable native restoration before React renders or Lenis measures the page.
// A reload starts at the hero; a newly opened section link keeps its anchor.
if (!isDashboard) {
  window.history.scrollRestoration = "manual";
  const navigation = performance.getEntriesByType("navigation")[0];
  if (navigation?.type === "reload") {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isDashboard ? <Suspense fallback={<p role="status">Carregando demonstração…</p>}><App /></Suspense> : <LandingPage />}
  </StrictMode>,
);

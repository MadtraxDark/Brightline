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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {window.location.pathname.replace(/\/+$/, "") === "/app" ? <Suspense fallback={<p role="status">Carregando demonstração…</p>}><App /></Suspense> : <LandingPage />}
  </StrictMode>,
);

import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import LandingPage from "./LandingPage.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import DashboardShell from "./components/DashboardShell.jsx";
import { validateSession } from "./lib/session.js";

function RequireAuth({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function checkSession() {
      setStatus("loading");
      try {
        const user = await validateSession(sessionStorage);
        if (active) {
          setStatus(
            !user
              ? "anonymous"
              : user.active_institution_id
                ? "authenticated"
                : "needs-institution",
          );
        }
      } catch (reason) {
        if (active) {
          setError(reason.message);
          setStatus("error");
        }
      }
    }
    checkSession();
    window.addEventListener("brightline:institution-changed", checkSession);
    return () => {
      active = false;
      window.removeEventListener(
        "brightline:institution-changed",
        checkSession,
      );
    };
  }, [attempt]);
  if (status === "loading")
    return (
      <div className="session-state" role="status">
        Verificando sua sessão…
      </div>
    );
  if (status === "error")
    return (
      <div className="session-state">
        <p role="alert">{error}</p>
        <button
          className="btn-primary"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Tentar novamente
        </button>
      </div>
    );
  if (status === "anonymous") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (
    status === "needs-institution" &&
    location.pathname !== "/configuracoes"
  ) {
    return <Navigate to="/configuracoes" replace />;
  }
  return children;
}

export default function App() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return <LandingPage />;
  if (path === "/login") return <Login />;
  if (path === "/cadastro") return <Register />;
  return (
    <RequireAuth>
      <DashboardShell />
    </RequireAuth>
  );
}

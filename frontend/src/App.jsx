import { Navigate, useLocation } from "react-router-dom";
import LandingPage from "./LandingPage.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import DashboardShell from "./components/DashboardShell.jsx";
import { isAuthenticated } from "./lib/session.js";

function RequireAuth({ children }) {
  const location = useLocation();
  if (!isAuthenticated(sessionStorage)) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
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

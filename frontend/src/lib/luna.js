const PUBLIC_ROUTES = new Set(["/", "/login", "/cadastro"]);

export function isLunaVisible(pathname) {
  const path = String(pathname ?? "").replace(/\/+$/, "") || "/";
  if (PUBLIC_ROUTES.has(path)) return false;
  if (path === "/comunicacao" || path.startsWith("/comunicacao/")) return false;
  return true;
}

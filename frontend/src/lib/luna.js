const PUBLIC_ROUTES = new Set(["/", "/login", "/cadastro"]);

export function isLunaVisible(pathname) {
  const path = String(pathname ?? "").replace(/\/+$/, "") || "/";
  return !PUBLIC_ROUTES.has(path);
}

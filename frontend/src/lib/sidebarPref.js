export const SIDEBAR_KEY = "brightline:ui";

function readObject(storage) {
  const raw = storage.getItem(SIDEBAR_KEY);
  if (!raw) return {};
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

export function readSidebarCollapsed(storage) {
  try {
    const value = readObject(storage);
    if (value.v !== 1 || typeof value.sidebarCollapsed !== "boolean") return false;
    return value.sidebarCollapsed;
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(storage, collapsed) {
  try {
    const current = readObject(storage);
    storage.setItem(SIDEBAR_KEY, JSON.stringify({ ...current, v: 1, sidebarCollapsed: collapsed }));
  } catch {
    /* falha de gravação é ignorada */
  }
}

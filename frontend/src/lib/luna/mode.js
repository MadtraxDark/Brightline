export const LUNA_MODE_KEY = "brightline:luna-mode";

export function getLunaMode(storage) {
  try {
    return storage?.getItem?.(LUNA_MODE_KEY) === "mock" ? "mock" : "auto";
  } catch {
    return "auto";
  }
}

export function setLunaMode(storage, mode) {
  try {
    storage?.setItem?.(LUNA_MODE_KEY, mode === "mock" ? "mock" : "auto");
  } catch {
    /* A preferência da demonstração fica no padrão se o storage falhar. */
  }
}

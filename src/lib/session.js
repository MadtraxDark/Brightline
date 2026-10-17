import { PROFILE_KEY } from "./profile.js";
export const SESSION_KEY = "brightline:session";

let memorySession = null;

export function resetSessionMemoryForTests() {
  memorySession = null;
}

export function isAuthenticated(storage) {
  try {
    return storage.getItem(SESSION_KEY) === "1";
  } catch {
    return memorySession === "1";
  }
}

export function login(storage) {
  try {
    storage.setItem(SESSION_KEY, "1");
  } catch {
    memorySession = "1";
  }
}

export function logout(storage) {
  try { storage.removeItem(PROFILE_KEY); } catch { /* A sessão ainda pode ser encerrada sem armazenamento. */ }
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    memorySession = null;
  }
}

export function safeRedirectPath(from) {
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) return "/";
  const path = from.split(/[?#]/, 1)[0];
  if (path === "/login" || path === "/cadastro") return "/";
  return from;
}

export function validateLogin(email, password) {
  const errors = {};
  const trimmed = String(email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    errors.email = "Informe um e-mail válido.";
  }
  if (password == null || String(password) === "") {
    errors.password = "Informe a senha.";
  }
  return errors;
}

export function validateRegistration(name, email, password, confirmation) {
  const errors = validateLogin(email, password);
  if (String(name ?? "").trim().length < 2) errors.name = "Informe seu nome completo.";
  if (String(password ?? "").length < 8) errors.password = "A senha deve ter pelo menos 8 caracteres.";
  if (!confirmation) errors.confirmation = "Confirme sua senha.";
  else if (password !== confirmation) errors.confirmation = "As senhas não coincidem.";
  return errors;
}

import { PROFILE_KEY } from "./profile.js";
export const SESSION_KEY = "brightline:session";
const AUTH_BASE = (import.meta.env?.VITE_AUTH_API_URL || "/api").replace(
  /\/$/,
  "",
);
let memorySession = null;
const validations = new WeakMap();

export function resetSessionMemoryForTests() {
  memorySession = null;
}

function readSession(storage) {
  try {
    const value = JSON.parse(storage.getItem(SESSION_KEY) || "null");
    return value?.access_token && value?.refresh_token && value?.user?.id
      ? value
      : null;
  } catch {
    return memorySession;
  }
}

function saveSession(storage, session) {
  if (!session?.access_token || !session?.refresh_token || !session?.user?.id) {
    throw new Error("O servidor retornou uma sessão inválida.");
  }
  try {
    const previous = readSession(storage);
    const profile =
      previous?.user?.id === session.user.id
        ? JSON.parse(storage.getItem(PROFILE_KEY) || "null")
        : null;
    storage.setItem(SESSION_KEY, JSON.stringify(session));
    storage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        name: profile?.name || session.user.name || "",
        photo: profile?.photo || "",
      }),
    );
  } catch {
    memorySession = session;
  }
  return session.user;
}

function clearSession(storage) {
  memorySession = null;
  try {
    storage.removeItem(SESSION_KEY);
    storage.removeItem(PROFILE_KEY);
  } catch {
    /* Storage indisponível. */
  }
}

export function isAuthenticated(storage) {
  return Boolean(readSession(storage));
}

async function authRequest(path, { body, token, method = "POST" } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${AUTH_BASE}/auth/${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    const data =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        path === "login" && response.status === 401
          ? "Não foi possível entrar: e-mail ou senha incorretos. Confira seus dados e tente novamente."
          : path === "login" && response.status === 403
            ? "A instituição selecionada não está vinculada ao seu perfil. Confira a instituição ou atualize seus vínculos."
            : typeof data?.detail === "string"
              ? data.detail
              : response.status === 422
                ? "Confira os dados. A senha do cadastro deve ter pelo menos 9 caracteres."
                : response.status === 401
                  ? "E-mail ou senha inválidos."
                  : "Não foi possível acessar o serviço de autenticação. Tente novamente.";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.status) throw error;
    throw new Error(
      "Não foi possível conectar ao servidor. Tente novamente em instantes.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function login(storage, { email, password, institution_id }) {
  const session = await authRequest("login", {
    body: { email: email.trim().toLowerCase(), password, institution_id },
  });
  return saveSession(storage, session);
}

export async function register({ name, email, password, institutions }) {
  return authRequest("signup", {
    body: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      institutions,
    },
  });
}

export async function updateInstitutions(storage, institutions) {
  const session = readSession(storage);
  if (!session)
    throw new Error("Entre novamente para editar suas instituições.");
  const result = await authRequest("institutions", {
    method: "PUT",
    token: session.access_token,
    body: { institutions },
  });
  const next = { ...session, user: { ...session.user, institutions, institution_id: result.institution_id } };
  try { storage.setItem(SESSION_KEY, JSON.stringify(next)); } catch { memorySession = next; }
  return result;
}

export async function switchInstitution(storage, institution_id) {
  const session = readSession(storage);
  if (!session) throw new Error("Entre novamente para trocar de instituição.");
  const result = await authRequest("institution", {
    method: "PUT",
    token: session.access_token,
    body: { institution_id },
  });
  const next = { ...session, user: { ...session.user, institution_id } };
  try { storage.setItem(SESSION_KEY, JSON.stringify(next)); } catch { memorySession = next; }
  return result;
}

async function verifyStoredSession(storage) {
  let session = readSession(storage);
  if (!session) return null;
  const originalToken = session.access_token;
  const isCurrent = () => readSession(storage)?.access_token === originalToken;
  try {
    const user = await authRequest("me", {
      method: "GET",
      token: session.access_token,
    });
    if (!isCurrent()) return readSession(storage)?.user || null;
    saveSession(storage, { ...session, user });
    return user;
  } catch (error) {
    if (error.status !== 401) throw error;
  }
  if (!isCurrent()) return readSession(storage)?.user || null;
  try {
    session = await authRequest("refresh", {
      body: { refresh_token: session.refresh_token },
    });
    if (!isCurrent()) return readSession(storage)?.user || null;
    return saveSession(storage, session);
  } catch (error) {
    if (error.status === 401) {
      if (isCurrent()) clearSession(storage);
      return null;
    }
    throw error;
  }
}

export function validateSession(storage) {
  if (validations.has(storage)) return validations.get(storage);
  const validation = verifyStoredSession(storage).finally(() =>
    validations.delete(storage),
  );
  validations.set(storage, validation);
  return validation;
}

export async function logout(storage) {
  const session = readSession(storage);
  clearSession(storage);
  try {
    if (session) await authRequest("logout", { token: session.access_token });
  } catch {
    /* A sessão local ainda é encerrada se o servidor estiver indisponível. */
  } finally {
    clearSession(storage);
  }
}

export function safeRedirectPath(from) {
  if (
    typeof from !== "string" ||
    !from.startsWith("/") ||
    from.startsWith("//")
  )
    return "/home";
  const path = from.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (
    path === "/" ||
    path === "/app" ||
    path === "/login" ||
    path === "/cadastro"
  )
    return "/home";
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
  if (String(name ?? "").trim().length < 2)
    errors.name = "Informe seu nome completo.";
  if (String(password ?? "").length < 9)
    errors.password = "A senha deve ter pelo menos 9 caracteres.";
  if (!confirmation) errors.confirmation = "Confirme sua senha.";
  else if (password !== confirmation)
    errors.confirmation = "As senhas não coincidem.";
  return errors;
}

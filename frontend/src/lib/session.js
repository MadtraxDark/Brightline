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

export function currentUser(storage) {
  return readSession(storage)?.user ?? null;
}

async function request(path, { body, token, method = "POST", signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${AUTH_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: signal
        ? AbortSignal.any([controller.signal, signal])
        : controller.signal,
      cache: "no-store",
    });
    const data =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        typeof data?.detail === "string"
          ? data.detail
          : response.status === 422
            ? "Confira os dados. A senha do cadastro deve ter pelo menos 9 caracteres."
            : response.status === 401
              ? "Usuário ou senha inválidos. Verifique seus dados e tente novamente."
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

function authRequest(path, options) {
  return request(`/auth/${path}`, options);
}

export async function getInstitutions() {
  const data = await request("/institutions", { method: "GET" });
  return data.institutions;
}

export async function login(storage, { email, password, institution_id }) {
  const session = await authRequest("login", {
    body: {
      email: email.trim().toLowerCase(),
      password,
      ...(institution_id ? { institution_id } : {}),
    },
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

export async function switchInstitution(storage, institution_id) {
  const session = readSession(storage);
  if (!session) throw new Error("Sua sessão expirou. Entre novamente.");
  const result = await authRequest("active-institution", {
    body: { institution_id },
    token: session.access_token,
  });
  const next = {
    ...session,
    user: {
      ...session.user,
      active_institution_id: institution_id,
      active_institution_name: result.active_institution_name,
    },
  };
  saveSession(storage, next);
  window.dispatchEvent(new CustomEvent("brightline:institution-changed"));
  return next.user;
}

export async function updateInstitutions(
  storage,
  institutions,
  active_institution_id,
) {
  const session = readSession(storage);
  if (!session) throw new Error("Sua sessão expirou. Entre novamente.");
  const result = await authRequest("institutions", {
    body: { institutions, active_institution_id },
    token: session.access_token,
  });
  const next = {
    ...session,
    user: {
      ...session.user,
      institutions: result.institutions,
      active_institution_id: result.active_institution_id,
      active_institution_name: result.active_institution_name,
    },
  };
  saveSession(storage, next);
  window.dispatchEvent(new CustomEvent("brightline:institution-changed"));
  return next.user;
}

export async function authenticatedRequest(storage, path, options = {}) {
  let session = readSession(storage);
  if (!session) throw new Error("Entre novamente para acessar os dados.");
  try {
    return await request(path, { ...options, token: session.access_token });
  } catch (error) {
    if (error.status !== 401) throw error;
    await validateSession(storage);
    session = readSession(storage);
    if (!session) throw error;
    return request(path, { ...options, token: session.access_token });
  }
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

export async function authorizedRequest(
  path,
  { method = "GET", body, timeoutMs = 15000, signal } = {},
) {
  const storage = sessionStorage;
  let session = readSession(storage);
  if (!session) throw new Error("Sessão expirada. Entre novamente.");
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const send = (token) =>
    fetch(`${AUTH_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body
          ? {
              "Content-Type":
                body instanceof Blob ? body.type : "application/json",
            }
          : {}),
        Authorization: `Bearer ${token}`,
      },
      body:
        body instanceof Blob ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  try {
    let response = await send(session.access_token);
    if (response.status === 401 && session.refresh_token) {
      session = await authRequest("refresh", {
        body: { refresh_token: session.refresh_token },
        signal: controller.signal,
      });
      saveSession(storage, session);
      response = await send(session.access_token);
    }
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      const error = new Error(
        typeof data?.detail === "string"
          ? data.detail
          : "Não foi possível carregar os laudos.",
      );
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (timedOut)
      throw new Error(
        "O servidor excedeu o tempo de resposta. Tente novamente.",
      );
    if (controller.signal.aborted)
      throw new DOMException("Solicitação cancelada.", "AbortError");
    if (error instanceof SyntaxError)
      throw new Error("O servidor retornou uma resposta inválida.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
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

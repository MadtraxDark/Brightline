const API_BASE = (import.meta.env?.VITE_AUTH_API_URL || "/api").replace(
  /\/$/,
  "",
);

function accessToken() {
  try {
    return JSON.parse(sessionStorage.getItem("brightline:session") || "null")
      ?.access_token;
  } catch {
    return null;
  }
}

function apiHref(value) {
  const parsed = new URL(value, window.location.origin);
  if (API_BASE.startsWith("/"))
    return `${API_BASE}${parsed.pathname}${parsed.search}`;
  return `${API_BASE}${parsed.pathname}${parsed.search}`;
}

async function request(path, options = {}) {
  const token = accessToken();
  if (!token) throw new Error("Entre novamente para acessar as radiografias.");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : null;
    throw new Error(detail || "Não foi possível carregar as radiografias.");
  }
  return data;
}

export function listRadiographs({
  offset = 0,
  limit = 24,
  pathology = "",
  classification = "",
} = {}) {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (pathology) query.set("pathology", pathology);
  if (classification) query.set("classification", classification);
  return request(`/dataset/images?${query}`);
}

export function getRadiograph(id) {
  return request(`/dataset/images/${encodeURIComponent(id)}`);
}

export async function getRadiographImageUrl(id) {
  const result = await request(
    `/dataset/images/${encodeURIComponent(id)}/signed-url`,
    { method: "POST" },
  );
  return apiHref(result.url);
}

export function getRadiographAnalysis(id) {
  return request(`/dataset/images/${encodeURIComponent(id)}/analysis`);
}

export function classifyRadiographById(id) {
  return request(`/dataset/images/${encodeURIComponent(id)}/classify`, {
    method: "POST",
  });
}

export function getReportAnalysis(id) {
  return request(`/reports/${encodeURIComponent(id)}/analysis`);
}

export function getReportRadiographUrl(id) {
  return request(`/reports/${encodeURIComponent(id)}/radiograph-url`, {
    method: "POST",
  }).then((result) => ({ ...result, url: apiHref(result.url) }));
}

export async function classifyUploadedRadiograph(file) {
  const form = new FormData();
  form.append("radiograph", file);
  return request("/radiographs/classify", { method: "POST", body: form });
}

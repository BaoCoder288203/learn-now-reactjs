/** Base URL for API. Empty in dev uses Vite proxy to /api. */
const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function handleUnauthorized(): void {
  localStorage.removeItem("toeic_token");
  localStorage.removeItem("toeic_user");
  window.location.href = "/login";
}

export async function authFetch(
  url: string,
  token: string,
  init?: RequestInit
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    handleUnauthorized();
  }

  return res;
}

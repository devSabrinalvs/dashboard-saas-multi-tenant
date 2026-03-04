/**
 * Cliente HTTP tipado para chamadas à API do app.
 * Usado pelos hooks TanStack Query nos client components.
 */

type ApiError = { error: string; issues?: unknown[] };

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v != null) searchParams.set(k, String(v));
      }
    }
    const fullUrl =
      params && searchParams.toString()
        ? `${url}?${searchParams.toString()}`
        : url;
    return apiFetch<T>(fullUrl);
  },

  post: <T>(url: string, body: unknown): Promise<T> =>
    apiFetch<T>(url, { method: "POST", body: JSON.stringify(body) }),

  patch: <T>(url: string, body: unknown): Promise<T> =>
    apiFetch<T>(url, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(url: string): Promise<T> =>
    apiFetch<T>(url, { method: "DELETE" }),
};

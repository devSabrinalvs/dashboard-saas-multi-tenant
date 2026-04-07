/**
 * Cliente HTTP tipado para chamadas à API do app.
 * Usado pelos hooks TanStack Query nos client components.
 */

type ApiErrorBody = { error: string; code?: string; details?: unknown; issues?: unknown[] };

/**
 * Erro lançado quando a API retorna status não-ok.
 * Expõe `code` para que os consumers possam diferenciar tipos de erro
 * (ex: "PLAN_LIMIT_REACHED") sem depender da mensagem de texto.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = (await res.json()) as ApiErrorBody;
    throw new ApiError(
      body.error ?? `HTTP ${res.status}`,
      body.code,
      body.details
    );
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

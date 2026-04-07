/**
 * Utilitário CSRF para uso em Client Components.
 *
 * Lê o cookie `csrf_token` definido pelo middleware e retorna o valor
 * para ser enviado como header `x-csrf-token` em mutações.
 *
 * Uso:
 *   const token = getCsrfToken();
 *   fetch("/api/...", {
 *     method: "DELETE",
 *     headers: { "x-csrf-token": token },
 *   });
 */

export const CSRF_HEADER = "x-csrf-token";

/**
 * Retorna o valor do cookie `csrf_token` ou string vazia se ausente.
 * Deve ser chamado apenas em código que roda no browser.
 */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match?.[1] ?? "";
}

/**
 * Retorna os headers padrão para mutações protegidas com CSRF.
 * Combina Content-Type: application/json e o token CSRF.
 */
export function csrfHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    [CSRF_HEADER]: getCsrfToken(),
    ...extra,
  };
}

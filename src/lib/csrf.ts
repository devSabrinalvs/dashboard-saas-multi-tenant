/**
 * CSRF — proteção Double Submit Cookie.
 *
 * Padrão:
 *   1. Middleware define o cookie `csrf_token` (não-HttpOnly) em page routes.
 *   2. Client lê o cookie via JS e envia o valor no header `x-csrf-token`.
 *   3. Route handler chama `validateCsrfRequest()` para comparar cookie ↔ header.
 *
 * Por que funciona:
 *   - evil.com não consegue ler o cookie (SameSite=Lax + política same-origin).
 *   - Portanto não consegue enviar o header correto em uma requisição cross-site.
 *
 * Este módulo é SERVER-ONLY. Para uso no cliente, veja csrf-client.ts.
 */

import { timingSafeEqual } from "crypto";

export const CSRF_COOKIE  = "csrf_token";
export const CSRF_HEADER  = "x-csrf-token";

/**
 * Extrai o valor do cookie `csrf_token` a partir do header Cookie raw.
 */
export function parseCsrfCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match?.[1] ?? null;
}

/**
 * Valida a proteção CSRF em uma Request:
 *   - Compara o valor do header `x-csrf-token` com o cookie `csrf_token`.
 *   - Usa comparação de tempo constante para evitar timing attacks.
 *
 * Retorna `true` se válido, `false` caso contrário.
 */
export function validateCsrfRequest(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieToken  = parseCsrfCookie(cookieHeader);
  const headerToken  = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;

  // Deve ter o mesmo comprimento para timingSafeEqual não lançar
  if (cookieToken.length !== headerToken.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(cookieToken, "utf8"),
      Buffer.from(headerToken, "utf8")
    );
  } catch {
    return false;
  }
}

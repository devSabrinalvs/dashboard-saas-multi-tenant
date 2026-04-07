/**
 * Funções puras para parsing e validação da ADMIN_ALLOWLIST.
 * Separado de require-super-admin.ts para testabilidade (sem IO).
 */

/**
 * Parseia ADMIN_ALLOWLIST a partir da variável de ambiente.
 * Retorna array de emails em lowercase, sem espaços.
 */
export function parseAdminAllowlist(raw: string | undefined): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Verifica se um email está na allowlist.
 */
export function isAdminAllowed(email: string, allowlist: string[]): boolean {
  return allowlist.includes(email.toLowerCase());
}

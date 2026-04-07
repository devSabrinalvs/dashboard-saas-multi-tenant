/**
 * Builders de chave para rate limiting.
 *
 * Formato: "rl:<categoria>:<identificador>"
 * Exemplo: "rl:invite:org_abc:usr_xyz"
 */

/**
 * Chave de rate limit para tentativas de login por IP.
 *
 * ATENÇÃO: x-forwarded-for é confiável apenas quando o proxy/load balancer
 * está configurado para repassá-lo corretamente (ex: Vercel, Railway).
 * Em dev local, o IP pode ser "unknown" — agrupa todas as chamadas locais.
 */
export function loginIpKey(ip: string): string {
  return `rl:login:ip:${ip}`;
}

/**
 * Chave de rate limit para criação de convites.
 * Escopo: por organização + usuário.
 */
export function inviteKey(orgId: string, userId: string): string {
  return `rl:invite:${orgId}:${userId}`;
}

/**
 * Chave de rate limit para mutações (projects/tasks).
 * Escopo: por organização + usuário.
 */
export function mutationKey(orgId: string, userId: string): string {
  return `rl:mutation:${orgId}:${userId}`;
}

/** Chave de rate limit para signup por IP. */
export function signupIpKey(ip: string): string {
  return `rl:signup:ip:${ip}`;
}

/** Chave de rate limit para signup por email. */
export function signupEmailKey(email: string): string {
  return `rl:signup:email:${email}`;
}

/** Chave de rate limit para reenvio de verificação por IP. */
export function resendIpKey(ip: string): string {
  return `rl:resend:ip:${ip}`;
}

/** Chave de rate limit para reenvio de verificação por email. */
export function resendEmailKey(email: string): string {
  return `rl:resend:email:${email}`;
}

/** Chave de rate limit para forgot password por IP. */
export function forgotIpKey(ip: string): string {
  return `rl:forgot:ip:${ip}`;
}

/** Chave de rate limit para forgot password por email. */
export function forgotEmailKey(email: string): string {
  return `rl:forgot:email:${email}`;
}

/** Chave de rate limit para login por email (por conta). */
export function loginEmailKey(email: string): string {
  return `rl:login:email:${email}`;
}

/** Chave de rate limit para verificação 2FA por userId. */
export function twoFaVerifyKey(userId: string): string {
  return `rl:2fa:verify:${userId}`;
}

/**
 * Extrai o IP a partir dos headers do callback `authorize` do NextAuth.
 * Diferente de `getClientIp`, aceita `Record<string, string | string[]>`.
 */
export function extractIpFromAuthorizeHeaders(
  headers: Record<string, string | string[] | undefined> | undefined
): string {
  if (!headers) return "unknown";
  const forwarded = headers["x-forwarded-for"];
  if (!forwarded) return "unknown";
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
  return first?.trim() ?? "unknown";
}

/**
 * Extrai o IP do cliente a partir dos headers da requisição.
 *
 * Usa x-forwarded-for (primeiro IP da lista = IP real em proxies confiáveis).
 * Fallback para "unknown" se o header não estiver presente.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

/** Chave de rate limit para deleção de conta. Escopo: por userId. */
export function deleteAccountKey(userId: string): string {
  return `rl:delete-account:user:${userId}`;
}

/** Chave de rate limit global para admin. Escopo: por email do admin. */
export function adminGlobalKey(adminEmail: string): string {
  return `rl:admin:global:${adminEmail}`;
}

/** Chave de rate limit para ações sensíveis do admin. Escopo: por email do admin. */
export function adminActionKey(adminEmail: string): string {
  return `rl:admin:action:${adminEmail}`;
}

/** Chave de rate limit para export de dados. Escopo: por orgId + userId. */
export function dataExportKey(orgId: string, userId: string): string {
  return `rl:data:export:${orgId}:${userId}`;
}

/** Chave de rate limit para import de dados. Escopo: por orgId + userId. */
export function dataImportKey(orgId: string, userId: string): string {
  return `rl:data:import:${orgId}:${userId}`;
}

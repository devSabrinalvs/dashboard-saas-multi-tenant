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

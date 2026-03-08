/**
 * Limites de rate limiting por categoria de rota.
 *
 * LOGIN_IP:    10 req/min  por IP  — protege contra brute-force de credenciais
 * INVITE:      20 req/h    por orgId+userId — limita spam de convites
 * MUTATIONS:  120 req/min  por orgId+userId — proteção geral de mutações (projects/tasks)
 */
export const RATE_LIMITS = {
  LOGIN_IP:  { limit: 10,  windowMs: 60_000 },
  INVITE:    { limit: 20,  windowMs: 3_600_000 },
  MUTATIONS: { limit: 120, windowMs: 60_000 },
} as const;

export type RateLimitConfig = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS];

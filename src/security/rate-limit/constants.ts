/**
 * Limites de rate limiting por categoria de rota.
 *
 * LOGIN_IP:      20 req/min  por IP  — protege contra brute-force de credenciais
 * LOGIN_EMAIL:   10 req/min  por email — limite por conta independente do IP
 * INVITE:        20 req/h    por orgId+userId — limita spam de convites
 * MUTATIONS:    120 req/min  por orgId+userId — proteção geral de mutações (projects/tasks)
 * SIGNUP_IP:     10 req/h    por IP  — limita criação de contas por IP
 * SIGNUP_EMAIL:   5 req/h    por email — limita tentativas por endereço
 * RESEND_IP:     10 req/h    por IP  — limita reenvio de verificação por IP
 * RESEND_EMAIL:   3 req/h    por email — limita reenvio por endereço
 * TWO_FA_VERIFY:    10 req/min  por userId — protege brute-force no código TOTP
 * DELETE_ACCOUNT:    3 req/dia   por userId — previne automação de deleção de contas
 * ADMIN_GLOBAL:      60 req/min  por adminEmail — proteção geral de endpoints admin
 * ADMIN_ACTION:      10 req/min  por adminEmail — ações sensíveis (unlock, revoke, etc.)
 */
export const RATE_LIMITS = {
  LOGIN_IP:     { limit: 20,  windowMs: 60_000 },
  LOGIN_EMAIL:  { limit: 10,  windowMs: 60_000 },
  INVITE:       { limit: 20,  windowMs: 3_600_000 },
  MUTATIONS:    { limit: 120, windowMs: 60_000 },
  SIGNUP_IP:    { limit: 10,  windowMs: 3_600_000 },
  SIGNUP_EMAIL: { limit: 5,   windowMs: 3_600_000 },
  RESEND_IP:    { limit: 10,  windowMs: 3_600_000 },
  RESEND_EMAIL: { limit: 3,   windowMs: 3_600_000 },
  FORGOT_IP:    { limit: 10,  windowMs: 3_600_000 },
  FORGOT_EMAIL:  { limit: 5,   windowMs: 3_600_000 },
  TWO_FA_VERIFY:    { limit: 10, windowMs: 60_000 },
  DELETE_ACCOUNT:   { limit: 3,  windowMs: 24 * 3_600_000 },
  ADMIN_GLOBAL:     { limit: 60, windowMs: 60_000 },
  ADMIN_ACTION:     { limit: 10, windowMs: 60_000 },
  DATA_EXPORT:      { limit: 5,  windowMs: 3_600_000 },
  DATA_IMPORT:      { limit: 3,  windowMs: 3_600_000 },
} as const;

export type RateLimitConfig = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS];

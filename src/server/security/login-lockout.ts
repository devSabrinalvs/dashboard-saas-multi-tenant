/**
 * Helpers puros para lockout de login por tentativas falhas.
 *
 * Sem dependências de banco — apenas lógica de cálculo de thresholds.
 * Fácil de testar unitariamente.
 */

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

interface LockThreshold {
  /** Quantidade mínima de falhas para ativar este nível de bloqueio. */
  failCount: number;
  /** Duração do bloqueio em ms. */
  durationMs: number;
}

/**
 * Tabela de thresholds de bloqueio progressivo.
 * Ordem crescente — o último threshold alcançado é o aplicado.
 */
export const LOCK_THRESHOLDS: LockThreshold[] = [
  { failCount: 5,  durationMs: 5  * 60 * 1000 },  //  5 min
  { failCount: 8,  durationMs: 15 * 60 * 1000 },  // 15 min
  { failCount: 10, durationMs: 60 * 60 * 1000 },  // 60 min
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retorna a duração de bloqueio em ms para o número de falhas dado.
 * Retorna 0 se nenhum threshold foi atingido.
 */
export function getLockDurationMs(failedCount: number): number {
  let duration = 0;
  for (const threshold of LOCK_THRESHOLDS) {
    if (failedCount >= threshold.failCount) {
      duration = threshold.durationMs;
    }
  }
  return duration;
}

/**
 * Calcula o novo `lockedUntil` após mais uma falha.
 * Retorna null se o número de falhas não atingiu nenhum threshold.
 */
export function computeLockedUntil(failedCount: number, now = new Date()): Date | null {
  const durationMs = getLockDurationMs(failedCount);
  if (durationMs === 0) return null;
  return new Date(now.getTime() + durationMs);
}

/**
 * Retorna true se a conta está bloqueada no momento atual.
 */
export function isAccountLocked(lockedUntil: Date | null | undefined): boolean {
  if (!lockedUntil) return false;
  return lockedUntil > new Date();
}

/**
 * Retorna os ms restantes de bloqueio, ou 0 se não bloqueada.
 */
export function getLockRemainingMs(lockedUntil: Date | null | undefined): number {
  if (!lockedUntil) return 0;
  return Math.max(0, lockedUntil.getTime() - Date.now());
}

/**
 * Formata ms de bloqueio em uma string legível: "X min" ou "X h Y min".
 */
export function formatLockDuration(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

/**
 * Extrai o IP do cliente a partir dos headers do authorize callback do NextAuth.
 * Headers podem ser `Record<string, string | string[]>`.
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

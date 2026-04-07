/**
 * Utilitários de sessão — parsing de user-agent e throttle de lastSeenAt.
 * Funções puras para facilitar testes unitários.
 */

/** Throttle de atualização de lastSeenAt: no máximo 1x a cada 10 minutos. */
export const LAST_SEEN_THROTTLE_MS = 10 * 60 * 1000;

/**
 * Converte um userAgent em label legível para o usuário.
 * Detecta browser + SO com regex simples (sem dependência externa).
 */
export function parseDeviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) return "Dispositivo desconhecido";

  // ── SO ──────────────────────────────────────────────────────────────────
  let os = "SO desconhecido";
  if (/Windows NT/i.test(userAgent)) os = "Windows";
  else if (/iPhone|iPad/i.test(userAgent)) os = "iOS";
  else if (/Android/i.test(userAgent)) os = "Android";
  else if (/Mac OS X/i.test(userAgent)) os = "macOS";
  else if (/Linux/i.test(userAgent)) os = "Linux";

  // ── Browser (ordem importa: Edge/Opera antes de Chrome) ─────────────────
  let browser = "Navegador desconhecido";
  if (/Edg\//i.test(userAgent)) browser = "Edge";
  else if (/OPR\//i.test(userAgent)) browser = "Opera";
  else if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent))
    browser = "Chrome";
  else if (/Firefox\//i.test(userAgent)) browser = "Firefox";
  else if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent))
    browser = "Safari";

  return `${browser} em ${os}`;
}

/**
 * Retorna true se já passaram pelo menos LAST_SEEN_THROTTLE_MS desde lastSeenAt.
 * Recebe `now` como parâmetro para facilitar testes unitários.
 */
export function shouldUpdateLastSeen(
  lastSeenAt: Date,
  now: Date = new Date()
): boolean {
  return now.getTime() - lastSeenAt.getTime() >= LAST_SEEN_THROTTLE_MS;
}

/**
 * Formata um Date em tempo relativo legível em pt-BR.
 * Ex: "há 2 horas", "há 3 dias".
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} minuto${diffMin > 1 ? "s" : ""}`;
  if (diffH < 24) return `há ${diffH} hora${diffH > 1 ? "s" : ""}`;
  if (diffD < 30) return `há ${diffD} dia${diffD > 1 ? "s" : ""}`;
  return date.toLocaleDateString("pt-BR");
}

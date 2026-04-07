/**
 * Logger JSON estruturado — server-only.
 *
 * Produz linhas JSON para cada evento de log, facilitando
 * ingestão por Datadog, Logtail, Axiom, CloudWatch, etc.
 *
 * Campos padrão:
 *   level      — "debug" | "info" | "warn" | "error"
 *   ts         — ISO 8601
 *   msg        — mensagem principal
 *   requestId  — ID único da request (opcional)
 *   userId     — ID do usuário autenticado (opcional)
 *   orgId      — ID da organização (opcional)
 *   route      — caminho da rota (opcional)
 *   method     — método HTTP (opcional)
 *   statusCode — código HTTP de resposta (opcional)
 *   durationMs — tempo de resposta em ms (opcional)
 *   error      — mensagem de erro (nunca stacktrace completo em prod)
 *
 * SEGURANÇA: Nunca inclua tokens, senhas, cookies ou secrets.
 * Use src/server/lib/redact.ts para mascarar dados sensíveis.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  orgId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  /** Mensagem de erro — nunca inclua stacktrace completo em produção. */
  error?: string;
  [key: string]: string | number | boolean | null | undefined;
}

const ACTIVE_LEVEL = (process.env.LOG_LEVEL ?? "info") as LogLevel;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

function isEnabled(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[ACTIVE_LEVEL];
}

function emit(level: LogLevel, msg: string, ctx?: LogContext): void {
  if (!isEnabled(level)) return;

  const entry = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...ctx,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Logger estruturado para uso em route handlers, use-cases e serviços.
 *
 * @example
 * import { logger } from "@/server/lib/logger";
 *
 * logger.info("User deleted account", { userId: ctx.userId, orgId: ctx.orgId });
 * logger.error("DB timeout", { route: "/api/health", error: err.message });
 */
export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit("debug", msg, ctx),
  info:  (msg: string, ctx?: LogContext) => emit("info",  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => emit("warn",  msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit("error", msg, ctx),

  /**
   * Cria uma instância de logger com contexto fixo (requestId, userId, etc.).
   * Útil para manter contexto ao longo de uma request sem repetir campos.
   *
   * @example
   * const log = logger.child({ requestId: "abc", userId: user.id });
   * log.info("Starting flow");
   * log.error("Flow failed", { error: err.message });
   */
  child(baseCtx: LogContext) {
    return {
      debug: (msg: string, ctx?: LogContext) =>
        emit("debug", msg, { ...baseCtx, ...ctx }),
      info:  (msg: string, ctx?: LogContext) =>
        emit("info",  msg, { ...baseCtx, ...ctx }),
      warn:  (msg: string, ctx?: LogContext) =>
        emit("warn",  msg, { ...baseCtx, ...ctx }),
      error: (msg: string, ctx?: LogContext) =>
        emit("error", msg, { ...baseCtx, ...ctx }),
    };
  },
};

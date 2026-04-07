/**
 * Next.js Instrumentation Hook
 *
 * Executado uma vez quando o servidor inicia (Node.js runtime).
 * Usado para inicializar ferramentas de observabilidade como Sentry.
 *
 * Sentry é opcional — habilitado apenas quando SENTRY_DSN está definido.
 * Se @sentry/nextjs não estiver instalado, o erro é silenciado (graceful degradation).
 *
 * Para ativar Sentry:
 *   1. pnpm add @sentry/nextjs
 *   2. Definir SENTRY_DSN no ambiente
 *   3. (Opcional) Ajustar tracesSampleRate conforme volume de requests
 *
 * Referência: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

export async function register(): Promise<void> {
  // Sentry só é inicializado no Node.js runtime (não no Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    // Import dinâmico: não falha se o pacote não estiver instalado
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry = await import("@sentry/nextjs" as any);
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "production",
      // 10% das transações — ajuste conforme volume e plano do Sentry
      tracesSampleRate: 0.1,
      // Não enviar dados de usuários identificáveis por padrão (LGPD/GDPR)
      sendDefaultPii: false,
    });
    console.log("[instrumentation] Sentry initialized");
  } catch {
    // @sentry/nextjs não instalado — ignorar silenciosamente
    console.warn(
      "[instrumentation] SENTRY_DSN definido mas @sentry/nextjs não encontrado. " +
      "Instale com: pnpm add @sentry/nextjs"
    );
  }
}

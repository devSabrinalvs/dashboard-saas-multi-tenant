/**
 * Alertas de segurança por email para atividade suspeita de login.
 *
 * Implementa cooldown para evitar spam: no máximo 1 alerta a cada 6h por conta.
 */

import { getMailer } from "@/server/email/mailer";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Intervalo mínimo entre alertas de segurança por conta (6 horas em ms). */
export const SECURITY_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retorna true se um alerta deve ser enviado com base no timestamp do último envio.
 * Respeita o cooldown de SECURITY_ALERT_COOLDOWN_MS.
 */
export function shouldSendAlert(lastSecurityAlertAt: Date | null | undefined, now = new Date()): boolean {
  if (!lastSecurityAlertAt) return true;
  return now.getTime() - lastSecurityAlertAt.getTime() >= SECURITY_ALERT_COOLDOWN_MS;
}

// ---------------------------------------------------------------------------
// Context de alerta
// ---------------------------------------------------------------------------

export interface SecurityAlertContext {
  ip: string;
  userAgent: string;
}

// ---------------------------------------------------------------------------
// Envio de alerta
// ---------------------------------------------------------------------------

/**
 * Envia email de alerta de segurança para o usuário.
 * Não lança exceção — falha silenciosa para não bloquear o fluxo de login.
 */
export async function sendLoginSecurityAlert(
  user: { email: string },
  context: SecurityAlertContext
): Promise<void> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/forgot-password`;

    await getMailer().sendSecurityAlertEmail({
      to: user.email,
      detectedAt: new Date().toISOString(),
      ip: context.ip || "desconhecido",
      userAgent: context.userAgent || "desconhecido",
      resetUrl,
    });
  } catch (err) {
    // Não propaga — alerta é best-effort
    console.error("[SecurityAlerts] Falha ao enviar alerta de segurança:", err);
  }
}

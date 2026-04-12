/**
 * Mailer abstraction — suporta Resend (prod) e Console (dev fallback).
 *
 * Se RESEND_API_KEY estiver definida, usa ResendMailer.
 * Caso contrário, usa ConsoleMailer que loga o link no console — útil
 * para desenvolvimento sem configurar um domínio de email real.
 */

export interface SecurityAlertParams {
  to: string;
  /** ISO string do momento da tentativa suspeita. */
  detectedAt: string;
  ip: string;
  userAgent: string;
  /** URL da página de reset de senha para incluir no email. */
  resetUrl: string;
}

export interface IMailer {
  sendVerificationEmail(params: {
    to: string;
    verificationUrl: string;
  }): Promise<void>;
  sendPasswordResetEmail(params: {
    to: string;
    resetUrl: string;
  }): Promise<void>;
  sendSecurityAlertEmail(params: SecurityAlertParams): Promise<void>;
  /** Enviado quando uma fatura falha — pede para atualizar método de pagamento. */
  sendPaymentFailedEmail(params: {
    to: string;
    orgName: string;
    billingUrl: string;
    graceUntil: Date;
  }): Promise<void>;
  /** Enviado quando a assinatura é cancelada ao fim do período. */
  sendSubscriptionCanceledEmail(params: {
    to: string;
    orgName: string;
    cancelDate: Date;
    billingUrl: string;
  }): Promise<void>;
  /** Enviado quando o plano é rebaixado para FREE após grace period. */
  sendDowngradedEmail(params: {
    to: string;
    orgName: string;
    billingUrl: string;
  }): Promise<void>;
  /** Digest semanal: tarefas abertas + concluídas na semana. */
  sendWeeklyDigestEmail(params: {
    to: string;
    name: string;
    orgName: string;
    orgUrl: string;
    openTasks: { title: string; projectName: string }[];
    completedThisWeek: { title: string; projectName: string }[];
  }): Promise<void>;
}

// ---------------------------------------------------------------------------
// ConsoleMailer — fallback para desenvolvimento
// ---------------------------------------------------------------------------

const consoleMailer: IMailer = {
  async sendVerificationEmail({ to, verificationUrl }) {
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("📧  [ConsoleMailer] Email de verificação (dev fallback)");
    console.log(`    Para: ${to}`);
    console.log(`    Link: ${verificationUrl}`);
    console.log("──────────────────────────────────────────────────────────\n");
  },
  async sendPasswordResetEmail({ to, resetUrl }) {
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("🔑  [ConsoleMailer] Email de reset de senha (dev fallback)");
    console.log(`    Para: ${to}`);
    console.log(`    Link: ${resetUrl}`);
    console.log("──────────────────────────────────────────────────────────\n");
  },
  async sendSecurityAlertEmail({ to, detectedAt, ip, userAgent, resetUrl }) {
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("🚨  [ConsoleMailer] Alerta de segurança (dev fallback)");
    console.log(`    Para: ${to}`);
    console.log(`    Detectado em: ${detectedAt}`);
    console.log(`    IP: ${ip}`);
    console.log(`    User-Agent: ${userAgent}`);
    console.log(`    Reset senha: ${resetUrl}`);
    console.log("──────────────────────────────────────────────────────────\n");
  },
  async sendPaymentFailedEmail({ to, orgName, billingUrl, graceUntil }) {
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("💳  [ConsoleMailer] Falha de pagamento (dev fallback)");
    console.log(`    Para: ${to}`);
    console.log(`    Org: ${orgName}`);
    console.log(`    Grace até: ${graceUntil.toISOString()}`);
    console.log(`    Billing URL: ${billingUrl}`);
    console.log("──────────────────────────────────────────────────────────\n");
  },
  async sendSubscriptionCanceledEmail({ to, orgName, cancelDate, billingUrl }) {
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("📭  [ConsoleMailer] Assinatura cancelando (dev fallback)");
    console.log(`    Para: ${to}`);
    console.log(`    Org: ${orgName}`);
    console.log(`    Cancela em: ${cancelDate.toISOString()}`);
    console.log(`    Billing URL: ${billingUrl}`);
    console.log("──────────────────────────────────────────────────────────\n");
  },
  async sendDowngradedEmail({ to, orgName, billingUrl }) {
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("⬇️  [ConsoleMailer] Plano rebaixado para FREE (dev fallback)");
    console.log(`    Para: ${to}`);
    console.log(`    Org: ${orgName}`);
    console.log(`    Billing URL: ${billingUrl}`);
    console.log("──────────────────────────────────────────────────────────\n");
  },
  async sendWeeklyDigestEmail({ to, name, orgName, orgUrl, openTasks, completedThisWeek }) {
    console.log("\n──────────────────────────────────────────────────────────");
    console.log("📋  [ConsoleMailer] Digest semanal (dev fallback)");
    console.log(`    Para: ${to} (${name})`);
    console.log(`    Org: ${orgName}`);
    console.log(`    Tarefas abertas: ${openTasks.length}`);
    console.log(`    Concluídas esta semana: ${completedThisWeek.length}`);
    console.log(`    URL: ${orgUrl}`);
    console.log("──────────────────────────────────────────────────────────\n");
  },
};

// ---------------------------------------------------------------------------
// ResendMailer — produção
// ---------------------------------------------------------------------------

function buildVerificationEmailHtml(verificationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifique seu email</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid #e4e4e7;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">Projorg</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#09090b;letter-spacing:-0.5px;">Verifique seu email</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#71717a;line-height:1.6;">
                Clique no botão abaixo para confirmar seu endereço de email e ativar sua conta.
                O link expira em <strong>24 horas</strong>.
              </p>
              <a href="${verificationUrl}"
                 style="display:inline-block;background:#09090b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;letter-spacing:0.1px;">
                Verificar email
              </a>
              <p style="margin:28px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                Se você não criou uma conta no Projorg, ignore este email com segurança.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Ou copie e cole este link no seu navegador:<br />
                <span style="color:#52525b;word-break:break-all;">${verificationUrl}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetEmailHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefina sua senha</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid #e4e4e7;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">Projorg</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#09090b;letter-spacing:-0.5px;">Redefina sua senha</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#71717a;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta.
                Clique no botão abaixo para criar uma nova senha.
                O link expira em <strong>60 minutos</strong>.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#09090b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;letter-spacing:0.1px;">
                Redefinir senha
              </a>
              <p style="margin:28px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                Se você não solicitou a redefinição de senha, ignore este email com segurança.
                Sua senha permanecerá inalterada.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Ou copie e cole este link no seu navegador:<br />
                <span style="color:#52525b;word-break:break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildSecurityAlertEmailHtml(params: {
  detectedAt: string;
  ip: string;
  userAgent: string;
  resetUrl: string;
}): string {
  const { detectedAt, ip, userAgent, resetUrl } = params;
  const formattedDate = new Date(detectedAt).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alerta de segurança</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:40px;max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid #e4e4e7;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#09090b;letter-spacing:-0.4px;">Projorg</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#09090b;letter-spacing:-0.5px;">Alerta de segurança</h1>
              <p style="margin:0 0 20px;font-size:15px;color:#71717a;line-height:1.6;">
                Detectamos múltiplas tentativas de login malsucedidas na sua conta.
                Se foi você, ignore este email. Caso contrário, recomendamos redefinir sua senha imediatamente.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
                <tr>
                  <td style="font-size:13px;color:#52525b;line-height:1.8;">
                    <strong style="color:#09090b;">Data/hora:</strong> ${formattedDate}<br />
                    <strong style="color:#09090b;">IP:</strong> ${ip}<br />
                    <strong style="color:#09090b;">Dispositivo:</strong> ${userAgent}
                  </td>
                </tr>
              </table>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#09090b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;letter-spacing:0.1px;">
                Redefinir minha senha
              </a>
              <p style="margin:28px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                Se você reconhece esta atividade, nenhuma ação é necessária.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Este email foi enviado automaticamente pelo Projorg como medida de segurança.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPaymentFailedEmailHtml(params: {
  orgName: string;
  billingUrl: string;
  graceUntil: Date;
}): string {
  const { orgName, billingUrl, graceUntil } = params;
  const graceDate = new Intl.DateTimeFormat("pt-BR").format(graceUntil);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Falha de pagamento</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:40px;max-width:560px;width:100%;">
        <tr><td style="padding-bottom:32px;border-bottom:1px solid #e4e4e7;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#09090b;">Projorg</p>
        </td></tr>
        <tr><td style="padding:32px 0;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#09090b;">Problema com seu pagamento</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#71717a;line-height:1.6;">
            O pagamento da assinatura de <strong>${orgName}</strong> falhou.
            Atualize seu método de pagamento para manter o acesso às funcionalidades do plano.
          </p>
          <p style="margin:0 0 28px;font-size:14px;color:#ef4444;font-weight:600;">
            Prazo para atualizar: ${graceDate}
          </p>
          <a href="${billingUrl}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
            Atualizar pagamento
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildSubscriptionCanceledEmailHtml(params: {
  orgName: string;
  cancelDate: Date;
  billingUrl: string;
}): string {
  const { orgName, cancelDate, billingUrl } = params;
  const cancelDateStr = new Intl.DateTimeFormat("pt-BR").format(cancelDate);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Assinatura cancelando</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:40px;max-width:560px;width:100%;">
        <tr><td style="padding-bottom:32px;border-bottom:1px solid #e4e4e7;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#09090b;">Projorg</p>
        </td></tr>
        <tr><td style="padding:32px 0;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#09090b;">Sua assinatura será encerrada</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#71717a;line-height:1.6;">
            A assinatura de <strong>${orgName}</strong> foi cancelada e encerrará em <strong>${cancelDateStr}</strong>.
            Até lá, você mantém acesso a todas as funcionalidades do plano atual.
          </p>
          <a href="${billingUrl}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
            Reativar assinatura
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildDowngradedEmailHtml(params: {
  orgName: string;
  billingUrl: string;
}): string {
  const { orgName, billingUrl } = params;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Plano rebaixado</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:40px;max-width:560px;width:100%;">
        <tr><td style="padding-bottom:32px;border-bottom:1px solid #e4e4e7;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#09090b;">Projorg</p>
        </td></tr>
        <tr><td style="padding:32px 0;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#09090b;">Plano rebaixado para Free</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#71717a;line-height:1.6;">
            Devido a problemas de pagamento não resolvidos, o plano de <strong>${orgName}</strong> foi rebaixado para Free.
            Seus dados estão preservados. Faça upgrade para retomar o acesso completo.
          </p>
          <a href="${billingUrl}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
            Fazer upgrade
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildWeeklyDigestHtml(params: {
  name: string;
  orgName: string;
  orgUrl: string;
  openTasks: { title: string; projectName: string }[];
  completedThisWeek: { title: string; projectName: string }[];
}): string {
  const { name, orgName, orgUrl, openTasks, completedThisWeek } = params;
  const firstName = name.split(" ")[0] ?? name;

  const taskRow = (t: { title: string; projectName: string }) =>
    `<tr>
      <td style="padding:6px 0;font-size:14px;color:#09090b;border-bottom:1px solid #f4f4f5;">
        ${t.title}
        <span style="font-size:12px;color:#a1a1aa;margin-left:6px;">${t.projectName}</span>
      </td>
    </tr>`;

  const openSection = openTasks.length
    ? `<h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#09090b;">Tarefas abertas (${openTasks.length})</h3>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
         ${openTasks.map(taskRow).join("")}
       </table>`
    : `<p style="font-size:14px;color:#71717a;margin:0 0 24px;">Nenhuma tarefa aberta atribuída a você.</p>`;

  const doneSection = completedThisWeek.length
    ? `<h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#16a34a;">Concluídas esta semana (${completedThisWeek.length})</h3>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
         ${completedThisWeek.map(taskRow).join("")}
       </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Seu digest semanal — ${orgName}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:40px;max-width:560px;width:100%;">
        <tr><td style="padding-bottom:24px;border-bottom:1px solid #e4e4e7;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#09090b;">Projorg</p>
          <p style="margin:4px 0 0;font-size:13px;color:#71717a;">${orgName}</p>
        </td></tr>
        <tr><td style="padding:28px 0 16px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090b;">Olá, ${firstName}!</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#71717a;line-height:1.6;">
            Aqui está seu resumo semanal de tarefas em <strong>${orgName}</strong>.
          </p>
          ${openSection}
          ${doneSection}
          <a href="${orgUrl}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
            Ver todas as tarefas
          </a>
        </td></tr>
        <tr><td style="padding-top:24px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">
            Você está recebendo este email porque é membro de <strong>${orgName}</strong> no Projorg.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function makeResendMailer(apiKey: string, from: string): IMailer {
  return {
    async sendVerificationEmail({ to, verificationUrl }) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);

      const { error } = await resend.emails.send({
        from,
        to,
        subject: "Verifique seu email — Projorg",
        html: buildVerificationEmailHtml(verificationUrl),
      });

      if (error) {
        console.error("[ResendMailer] Falha ao enviar email:", error);
        throw new Error("Falha ao enviar email de verificação.");
      }
    },
    async sendPasswordResetEmail({ to, resetUrl }) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);

      const { error } = await resend.emails.send({
        from,
        to,
        subject: "Redefina sua senha — Projorg",
        html: buildPasswordResetEmailHtml(resetUrl),
      });

      if (error) {
        console.error("[ResendMailer] Falha ao enviar email de reset:", error);
        throw new Error("Falha ao enviar email de redefinição de senha.");
      }
    },
    async sendSecurityAlertEmail({ to, detectedAt, ip, userAgent, resetUrl }) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);

      const { error } = await resend.emails.send({
        from,
        to,
        subject: "Alerta de segurança — Projorg",
        html: buildSecurityAlertEmailHtml({ detectedAt, ip, userAgent, resetUrl }),
      });

      if (error) {
        console.error("[ResendMailer] Falha ao enviar alerta de segurança:", error);
        // Não lança — alerta de segurança não deve bloquear o fluxo de login.
      }
    },
    async sendPaymentFailedEmail({ to, orgName, billingUrl, graceUntil }) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from,
        to,
        subject: "Ação necessária: atualize seu método de pagamento — Projorg",
        html: buildPaymentFailedEmailHtml({ orgName, billingUrl, graceUntil }),
      });
      if (error) console.error("[ResendMailer] Falha ao enviar email payment_failed:", error);
    },
    async sendSubscriptionCanceledEmail({ to, orgName, cancelDate, billingUrl }) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from,
        to,
        subject: "Sua assinatura será encerrada — Projorg",
        html: buildSubscriptionCanceledEmailHtml({ orgName, cancelDate, billingUrl }),
      });
      if (error) console.error("[ResendMailer] Falha ao enviar email subscription_canceled:", error);
    },
    async sendDowngradedEmail({ to, orgName, billingUrl }) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from,
        to,
        subject: "Plano rebaixado para Free — Projorg",
        html: buildDowngradedEmailHtml({ orgName, billingUrl }),
      });
      if (error) console.error("[ResendMailer] Falha ao enviar email downgraded:", error);
    },
    async sendWeeklyDigestEmail({ to, name, orgName, orgUrl, openTasks, completedThisWeek }) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from,
        to,
        subject: `Seu digest semanal — ${orgName}`,
        html: buildWeeklyDigestHtml({ name, orgName, orgUrl, openTasks, completedThisWeek }),
      });
      if (error) console.error("[ResendMailer] Falha ao enviar digest semanal:", error);
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Retorna o mailer adequado com base nas variáveis de ambiente.
 * ResendMailer se RESEND_API_KEY existir, ConsoleMailer caso contrário.
 */
export function getMailer(): IMailer {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Projorg <no-reply@projorg.dev>";

  if (apiKey) {
    return makeResendMailer(apiKey, from);
  }

  return consoleMailer;
}

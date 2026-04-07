import { generateToken, hashToken } from "@/server/auth/token";
import { getMailer } from "@/server/email/mailer";
import { findUserByEmail } from "@/server/repo/user-repo";
import {
  createPasswordResetToken,
  invalidatePreviousResetTokens,
} from "@/server/repo/password-reset-token-repo";

const SIXTY_MINUTES_MS = 60 * 60 * 1000;

/**
 * Inicia o fluxo de redefinição de senha.
 *
 * Nunca lança erro nem revela se o email existe — a resposta é sempre
 * genérica para evitar enumeração de usuários.
 *
 * Se o usuário existir e tiver email verificado:
 * - invalida tokens anteriores pendentes
 * - cria novo PasswordResetToken (60 min de validade)
 * - envia email com link de reset
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await findUserByEmail(email);

  if (!user || !user.emailVerified) {
    return;
  }

  await invalidatePreviousResetTokens(user.id);

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SIXTY_MINUTES_MS);

  await createPasswordResetToken(user.id, tokenHash, expiresAt);

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  await getMailer().sendPasswordResetEmail({ to: email, resetUrl });
}

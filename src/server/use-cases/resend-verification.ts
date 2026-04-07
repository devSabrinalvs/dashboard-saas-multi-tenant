import { generateToken, hashToken } from "@/server/auth/token";
import { getMailer } from "@/server/email/mailer";
import { findUserByEmail } from "@/server/repo/user-repo";
import {
  createVerificationToken,
  invalidatePreviousTokens,
} from "@/server/repo/verification-token-repo";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Reenvia o email de verificação se o usuário existir e não estiver verificado.
 *
 * Esta função NUNCA lança erro de "usuário não encontrado" para evitar
 * enumeração de emails. A resposta para o cliente é sempre genérica.
 *
 * Internamente:
 * - Se o user não existe → não faz nada.
 * - Se o user já está verificado → não faz nada.
 * - Se o user existe e não verificado → invalida tokens anteriores, cria novo e envia.
 */
export async function resendVerification(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user || user.emailVerified !== null) return;

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TWENTY_FOUR_HOURS_MS);

  await invalidatePreviousTokens(user.id);
  await createVerificationToken(user.id, tokenHash, expiresAt);

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const verificationUrl = `${baseUrl}/verify-email?token=${rawToken}`;

  await getMailer().sendVerificationEmail({
    to: normalizedEmail,
    verificationUrl,
  });
}

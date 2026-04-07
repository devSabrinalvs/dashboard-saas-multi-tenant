import { hashPassword } from "@/server/auth/password";
import { generateToken, hashToken } from "@/server/auth/token";
import { getMailer } from "@/server/email/mailer";
import { EmailAlreadyExistsError } from "@/server/errors/auth-errors";
import { createUser, findUserByEmail } from "@/server/repo/user-repo";
import {
  createVerificationToken,
  invalidatePreviousTokens,
} from "@/server/repo/verification-token-repo";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface RegisterUserInput {
  name?: string;
  email: string;
  password: string;
}

/**
 * Registra um novo usuário com email/senha e envia o email de verificação.
 *
 * - Email é lowercased antes de ser salvo.
 * - Senha é hasheada com bcrypt + pepper (cost 12).
 * - Token raw é enviado por email; apenas o hash SHA-256 é salvo no DB.
 * - emailVerified fica null até o usuário clicar no link.
 *
 * @throws EmailAlreadyExistsError se o email já estiver cadastrado.
 */
export async function registerUser({
  name,
  email,
  password,
}: RegisterUserInput): Promise<{ email: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) throw new EmailAlreadyExistsError();

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email: normalizedEmail, name, passwordHash });

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

  return { email: normalizedEmail };
}

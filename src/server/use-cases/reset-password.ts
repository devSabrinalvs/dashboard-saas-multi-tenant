import { hashPassword } from "@/server/auth/password";
import { hashToken } from "@/server/auth/token";
import { InvalidTokenError } from "@/server/errors/auth-errors";
import { prisma } from "@/lib/prisma";
import {
  findValidResetToken,
  markResetTokenUsed,
} from "@/server/repo/password-reset-token-repo";
import { resetLoginCounters } from "@/server/repo/user-repo";

interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

/**
 * Conclui o fluxo de redefinição de senha.
 *
 * - Valida o token (hash SHA-256, não expirado, não usado)
 * - Atualiza a senha do usuário com bcrypt + pepper (cost 12)
 * - Marca o token como usado
 *
 * @throws InvalidTokenError se o token não for válido.
 */
export async function resetPassword({
  token,
  newPassword,
}: ResetPasswordInput): Promise<{ ok: true }> {
  const tokenHash = hashToken(token);
  const record = await findValidResetToken(tokenHash);

  if (!record) {
    throw new InvalidTokenError();
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: record.userId },
    data: { password: passwordHash },
  });

  // Reseta lockout — fire-and-forget: se falhar, não bloqueia o reset.
  // O token só é marcado como usado após a senha ser atualizada com sucesso.
  resetLoginCounters(record.userId).catch((err) => {
    console.error("[resetPassword] Falha ao resetar contadores de lockout:", err);
  });

  await markResetTokenUsed(record.id);

  return { ok: true };
}

import { hashToken } from "@/server/auth/token";
import { InvalidTokenError } from "@/server/errors/auth-errors";
import { markEmailVerified } from "@/server/repo/user-repo";
import {
  findValidToken,
  markTokenUsed,
} from "@/server/repo/verification-token-repo";

/**
 * Verifica o token de email recebido via link.
 *
 * Fluxo:
 * 1. Faz hash do token raw para comparar com o armazenado no DB.
 * 2. Busca token válido (não usado + não expirado).
 * 3. Marca email como verificado e token como usado.
 *
 * @throws InvalidTokenError se o token não existir, estiver expirado ou já usado.
 */
export async function verifyEmailToken(
  rawToken: string
): Promise<{ ok: true }> {
  const tokenHash = hashToken(rawToken);

  const token = await findValidToken(tokenHash);
  if (!token) throw new InvalidTokenError();

  await markEmailVerified(token.userId);
  await markTokenUsed(token.id);

  return { ok: true };
}

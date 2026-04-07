import { prisma } from "@/lib/prisma";
import type { EmailVerificationToken } from "@/generated/prisma/client";

/**
 * Cria um novo token de verificação de email.
 * Apenas o hash do token é persistido — nunca o token raw.
 */
export async function createVerificationToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<EmailVerificationToken> {
  return prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

/**
 * Busca um token válido pelo hash.
 * Válido = não usado (usedAt IS NULL) e não expirado (expiresAt > now()).
 */
export async function findValidToken(
  tokenHash: string
): Promise<EmailVerificationToken | null> {
  return prisma.emailVerificationToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

/**
 * Marca um token como usado para que não possa ser reutilizado.
 */
export async function markTokenUsed(id: string): Promise<void> {
  await prisma.emailVerificationToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

/**
 * Invalida todos os tokens pendentes de um usuário.
 * Chamado antes de gerar um novo token (signup ou resend) para evitar
 * múltiplos links ativos simultâneos.
 */
export async function invalidatePreviousTokens(userId: string): Promise<void> {
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

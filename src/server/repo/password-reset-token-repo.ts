import { prisma } from "@/lib/prisma";
import type { PasswordResetToken } from "@/generated/prisma/client";

/**
 * Cria um novo token de reset de senha.
 * Apenas o hash do token é persistido — nunca o token raw.
 */
export async function createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<PasswordResetToken> {
  return prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

/**
 * Busca um token válido pelo hash.
 * Válido = não usado (usedAt IS NULL) e não expirado (expiresAt > now()).
 */
export async function findValidResetToken(
  tokenHash: string
): Promise<PasswordResetToken | null> {
  return prisma.passwordResetToken.findFirst({
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
export async function markResetTokenUsed(id: string): Promise<void> {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

/**
 * Invalida todos os tokens pendentes de um usuário.
 * Chamado antes de gerar um novo token para evitar múltiplos links ativos.
 */
export async function invalidatePreviousResetTokens(userId: string): Promise<void> {
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

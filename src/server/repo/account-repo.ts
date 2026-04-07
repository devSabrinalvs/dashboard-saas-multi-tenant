/**
 * Repositório para operações de deleção de conta.
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Soft delete — revoga tudo associado ao usuário
// ---------------------------------------------------------------------------

/**
 * Soft-deleta o usuário e revoga todas as sessões e dispositivos de confiança.
 *
 * Operações em ordem:
 * 1. Seta deletedAt = now() no User
 * 2. Revoga todos os UserSessionMeta (updateMany — revokedAt)
 * 3. Revoga todos os TrustedDevice (updateMany — revokedAt)
 * 4. Deleta registros Session do NextAuth (via deleteMany)
 */
export async function softDeleteUser(userId: string): Promise<void> {
  // 1. Marcar usuário como deletado
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  // 2. Revogar todas as session metas (Etapa F)
  await prisma.userSessionMeta.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // 3. Revogar todos os trusted devices (Etapa E)
  await prisma.trustedDevice.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // 4. Deletar registros Session do NextAuth adapter (cobre OAuth/database sessions)
  await prisma.session.deleteMany({ where: { userId } });
}

// ---------------------------------------------------------------------------
// Informações do usuário para o fluxo de deleção
// ---------------------------------------------------------------------------

export interface UserDeletionInfo {
  email: string;
  /** True se o usuário tem senha (Credentials). False = Google-only. */
  hasPassword: boolean;
  twoFactorEnabled: boolean;
}

/**
 * Retorna as informações necessárias para determinar o fluxo de deleção.
 * Usado pelo server component da settings page para passar como prop ao client.
 */
export async function getUserDeletionInfo(
  userId: string
): Promise<UserDeletionInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, password: true, twoFactorEnabled: true },
  });
  if (!user) return null;
  return {
    email: user.email,
    hasPassword: !!user.password,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

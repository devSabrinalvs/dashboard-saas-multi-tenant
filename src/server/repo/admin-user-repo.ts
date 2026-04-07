/**
 * Repositório de usuários para o Admin Console interno.
 *
 * NUNCA retorna: password, totpSecretEncrypted, twoFactorTempSecretEncrypted,
 * twoFactorRecoveryCodeHashes.
 *
 * Usa $queryRaw para buscas (findMany não funciona com PrismaPg).
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  twoFactorEnabled: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  lastFailedLoginAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface AdminUserDetail extends AdminUserRow {
  /** Número de orgs em que é membro. */
  orgCount: number;
  /** Número de sessões ativas (não revogadas). */
  activeSessionCount: number;
}

// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

/**
 * Busca usuários por email (case-insensitive, parcial).
 * Retorna no máximo 50 resultados ordenados por createdAt DESC.
 */
export async function searchAdminUsers(search: string): Promise<AdminUserRow[]> {
  const pattern = `%${search.toLowerCase()}%`;
  return prisma.$queryRaw<AdminUserRow[]>`
    SELECT
      id,
      email,
      name,
      "emailVerified",
      "twoFactorEnabled",
      "failedLoginCount",
      "lockedUntil",
      "lastLoginAt",
      "lastFailedLoginAt",
      "deletedAt",
      "createdAt"
    FROM "User"
    WHERE LOWER(email) LIKE ${pattern}
    ORDER BY "createdAt" DESC
    LIMIT 50
  `;
}

/**
 * Retorna detalhes completos de um usuário por ID (sem campos sensíveis).
 */
export async function findAdminUserById(
  userId: string
): Promise<AdminUserDetail | null> {
  const rows = await prisma.$queryRaw<
    (AdminUserRow & { orgCount: bigint; activeSessionCount: bigint })[]
  >`
    SELECT
      u.id,
      u.email,
      u.name,
      u."emailVerified",
      u."twoFactorEnabled",
      u."failedLoginCount",
      u."lockedUntil",
      u."lastLoginAt",
      u."lastFailedLoginAt",
      u."deletedAt",
      u."createdAt",
      (SELECT COUNT(*) FROM "Membership" m WHERE m."userId" = u.id) AS "orgCount",
      (SELECT COUNT(*) FROM "UserSessionMeta" s
        WHERE s."userId" = u.id AND s."revokedAt" IS NULL
        AND s."lastSeenAt" > NOW() - INTERVAL '30 days') AS "activeSessionCount"
    FROM "User" u
    WHERE u.id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...row,
    orgCount: Number(row.orgCount),
    activeSessionCount: Number(row.activeSessionCount),
  };
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

/** Reseta lockout: zera failedLoginCount e limpa lockedUntil. */
export async function adminUnlockUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    },
  });
}

/** Revoga todas as sessões ativas do usuário. */
export async function adminRevokeAllSessions(userId: string): Promise<number> {
  const result = await prisma.userSessionMeta.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/** Marca o email do usuário como verificado (agora). */
export async function adminMarkEmailVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
}

/** Desativa 2FA do usuário: limpa secret, flags e recovery codes. */
export async function adminDisable2FA(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      totpSecretEncrypted: null,
      twoFactorTempSecretEncrypted: null,
      twoFactorEnabledAt: null,
      twoFactorRecoveryCodeHashes: [],
    },
  });
}

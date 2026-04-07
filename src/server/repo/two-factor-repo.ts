/**
 * Repositório para operações de 2FA no banco de dados.
 * Usando findFirst/findUnique/create/update/delete (Prisma 7 + PrismaPg).
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// User — campos 2FA
// ---------------------------------------------------------------------------

/** Salva o secret TOTP temporário (criptografado) durante o wizard de setup. */
export async function saveTempTotpSecret(
  userId: string,
  encryptedSecret: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorTempSecretEncrypted: encryptedSecret },
  });
}

/** Confirma o setup: move tempSecret → totpSecret, ativa 2FA, salva recovery codes. */
export async function enableTwoFactor(
  userId: string,
  encryptedSecret: string,
  recoveryCodeHashes: string[]
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      totpSecretEncrypted: encryptedSecret,
      twoFactorTempSecretEncrypted: null,
      twoFactorEnabledAt: new Date(),
      twoFactorRecoveryCodeHashes: recoveryCodeHashes,
    },
  });
}

/** Desativa 2FA e limpa todos os dados relacionados. */
export async function disableTwoFactor(userId: string): Promise<void> {
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

/** Remove um recovery code usado (pelo seu hash). */
export async function removeRecoveryCodeHash(
  userId: string,
  hashToRemove: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorRecoveryCodeHashes: true },
  });
  if (!user) return;
  const updated = user.twoFactorRecoveryCodeHashes.filter((h) => h !== hashToRemove);
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorRecoveryCodeHashes: updated },
  });
}

/** Busca os campos 2FA de um usuário pelo ID. */
export async function findUserTwoFactorData(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      twoFactorEnabled: true,
      totpSecretEncrypted: true,
      twoFactorTempSecretEncrypted: true,
      twoFactorRecoveryCodeHashes: true,
    },
  });
}

// ---------------------------------------------------------------------------
// TwoFactorVerification — challenge de login
// ---------------------------------------------------------------------------

const VERIFICATION_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Cria ou atualiza um TwoFactorVerification para o userId.
 * Usado após validação do TOTP para sinalizar ao JWT callback que o 2FA foi completado.
 */
export async function createTwoFactorVerification(
  userId: string,
  nonce: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  await prisma.twoFactorVerification.create({
    data: { userId, nonce, expiresAt },
  });
}

/**
 * Busca e consome um TwoFactorVerification válido para (userId, nonce).
 * Deleta o registro se encontrado (uso único).
 * Retorna true se encontrado e válido.
 */
export async function consumeTwoFactorVerification(
  userId: string,
  nonce: string
): Promise<boolean> {
  const record = await prisma.twoFactorVerification.findFirst({
    where: {
      userId,
      nonce,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) return false;
  await prisma.twoFactorVerification.delete({ where: { id: record.id } });
  return true;
}

/** Remove verificações expiradas (limpeza periódica). */
export async function deleteExpiredVerifications(): Promise<void> {
  await prisma.twoFactorVerification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

// ---------------------------------------------------------------------------
// TrustedDevice
// ---------------------------------------------------------------------------

const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/** Cria um trusted device para o usuário. */
export async function createTrustedDevice(params: {
  userId: string;
  tokenHash: string;
  userAgent: string;
  ip: string;
}): Promise<void> {
  await prisma.trustedDevice.create({
    data: {
      userId: params.userId,
      tokenHash: params.tokenHash,
      userAgent: params.userAgent,
      ip: params.ip,
      expiresAt: new Date(Date.now() + TRUSTED_DEVICE_TTL_MS),
    },
  });
}

/** Verifica se um tokenHash é um dispositivo de confiança válido para o userId. Atualiza lastUsedAt. */
export async function validateTrustedDevice(
  userId: string,
  tokenHash: string
): Promise<boolean> {
  const device = await prisma.trustedDevice.findFirst({
    where: {
      userId,
      tokenHash,
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
  });
  if (!device) return false;
  // Atualiza lastUsedAt em background
  prisma.trustedDevice
    .update({ where: { id: device.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
  return true;
}

export interface TrustedDeviceRow {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
}

/**
 * Lista os trusted devices ativos de um usuário (para UI de gerenciamento).
 * Usa $queryRaw por limitação do PrismaPg (findMany não funciona).
 */
export async function listTrustedDevices(
  userId: string
): Promise<TrustedDeviceRow[]> {
  return prisma.$queryRaw<TrustedDeviceRow[]>`
    SELECT id, "userAgent", ip, "createdAt", "lastUsedAt", "expiresAt"
    FROM "TrustedDevice"
    WHERE "userId" = ${userId}
      AND "revokedAt" IS NULL
      AND "expiresAt" > NOW()
    ORDER BY "createdAt" DESC
  `;
}

/**
 * Revoga um trusted device pelo id.
 * Verifica que pertence ao userId antes de revogar (prevenção de IDOR).
 * Retorna false se não encontrado ou de outro usuário.
 */
export async function revokeTrustedDeviceById(
  id: string,
  userId: string
): Promise<boolean> {
  const device = await prisma.trustedDevice.findUnique({
    where: { id },
    select: { userId: true, revokedAt: true },
  });
  if (!device || device.userId !== userId) return false;
  if (device.revokedAt) return true;

  await prisma.trustedDevice.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return true;
}

/** Revoga todos os trusted devices de um usuário (ex: ao desativar 2FA). */
export async function revokeAllTrustedDevices(userId: string): Promise<void> {
  await prisma.trustedDevice.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

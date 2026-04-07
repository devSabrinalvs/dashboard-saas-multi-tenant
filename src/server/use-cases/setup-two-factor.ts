/**
 * Use-cases para o wizard de setup/disable do 2FA TOTP.
 *
 * Fluxo de ativação:
 *   1. initTwoFactorSetup   — gera secret + QR code, salva tempSecret criptografado
 *   2. confirmTwoFactorSetup — valida código TOTP, persiste secret, gera recovery codes
 *
 * Fluxo de desativação:
 *   disableTwoFactor — valida código TOTP, limpa dados 2FA + revoga trusted devices
 */

import { encrypt as encryptSecret, decrypt as decryptSecret } from "@/server/security/crypto";
import { generateTotpSetup, verifyTotpCode } from "@/server/security/totp";
import {
  generateRecoveryCodes,
  hashRecoveryCodes,
} from "@/server/security/recovery-codes";
import {
  saveTempTotpSecret,
  enableTwoFactor,
  disableTwoFactor,
  findUserTwoFactorData,
  revokeAllTrustedDevices,
} from "@/server/repo/two-factor-repo";
import {
  InvalidTotpError,
  TwoFactorNotEnabledError,
} from "@/server/errors/auth-errors";

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export interface InitTwoFactorResult {
  qrDataUrl: string;
  secretBase32: string; // retornado para o cliente exibir como fallback text
}

/**
 * Passo 1: gera TOTP secret e salva criptografado como tempSecret.
 * Retorna QR code e secret em Base32 para exibir ao usuário.
 */
export async function initTwoFactorSetup(
  userId: string,
  userEmail: string
): Promise<InitTwoFactorResult> {
  const { secretBase32, qrDataUrl } = await generateTotpSetup(userEmail);
  const encrypted = encryptSecret(secretBase32);
  await saveTempTotpSecret(userId, encrypted);
  return { qrDataUrl, secretBase32 };
}

// ---------------------------------------------------------------------------
// Confirm
// ---------------------------------------------------------------------------

export interface ConfirmTwoFactorResult {
  recoveryCodes: string[]; // plaintext — exibir UMA VEZ e depois descartar
}

/**
 * Passo 2: valida o código TOTP contra o tempSecret.
 * Se válido, ativa 2FA: move tempSecret → totpSecret, gera recovery codes.
 *
 * @throws InvalidTotpError se o código for inválido.
 */
export async function confirmTwoFactorSetup(
  userId: string,
  code: string
): Promise<ConfirmTwoFactorResult> {
  const userData = await findUserTwoFactorData(userId);

  if (!userData?.twoFactorTempSecretEncrypted) {
    throw new InvalidTotpError();
  }

  const secretBase32 = decryptSecret(userData.twoFactorTempSecretEncrypted);
  const isValid = verifyTotpCode(code, secretBase32);
  if (!isValid) throw new InvalidTotpError();

  const recoveryCodes = generateRecoveryCodes();
  const recoveryCodeHashes = hashRecoveryCodes(recoveryCodes);

  await enableTwoFactor(userId, userData.twoFactorTempSecretEncrypted, recoveryCodeHashes);

  return { recoveryCodes };
}

// ---------------------------------------------------------------------------
// Disable
// ---------------------------------------------------------------------------

/**
 * Desativa o 2FA após validar o código TOTP atual.
 * Revoga todos os trusted devices do usuário.
 *
 * @throws TwoFactorNotEnabledError se 2FA não estiver ativo.
 * @throws InvalidTotpError se o código TOTP for inválido.
 */
export async function disableTwoFactorSetup(
  userId: string,
  totpCode: string
): Promise<void> {
  const userData = await findUserTwoFactorData(userId);

  if (!userData?.twoFactorEnabled || !userData.totpSecretEncrypted) {
    throw new TwoFactorNotEnabledError();
  }

  const secretBase32 = decryptSecret(userData.totpSecretEncrypted);
  const isValid = verifyTotpCode(totpCode, secretBase32);
  if (!isValid) throw new InvalidTotpError();

  await revokeAllTrustedDevices(userId);
  await disableTwoFactor(userId);
}

/**
 * Use-case para verificação de 2FA durante o login.
 *
 * Chamado pelo route handler POST /api/auth/2fa/verify após o usuário
 * submeter o código TOTP (ou recovery code).
 *
 * Resultado:
 *   - Cria TwoFactorVerification no DB (consumida pelo jwt callback via session.update())
 *   - Opcionalmente cria TrustedDevice (cookie gerado pelo route handler)
 *
 * @throws InvalidTotpError se o código for inválido.
 */

import { decrypt as decryptSecret } from "@/server/security/crypto";
import { verifyTotpCode } from "@/server/security/totp";
import { findMatchingRecoveryCodeHash } from "@/server/security/recovery-codes";
import { createHash, randomBytes } from "crypto";
import {
  findUserTwoFactorData,
  removeRecoveryCodeHash,
  createTwoFactorVerification,
  createTrustedDevice,
} from "@/server/repo/two-factor-repo";
import { InvalidTotpError } from "@/server/errors/auth-errors";

export interface VerifyTwoFactorResult {
  /** Nonce gravado em TwoFactorVerification — enviado de volta ao cliente. */
  nonce: string;
  /**
   * Token raw para o cookie td_token (se rememberDevice=true).
   * O route handler grava o cookie; apenas o hash é salvo no DB.
   */
  trustedDeviceToken?: string;
}

export async function verifyTwoFactorLogin(params: {
  userId: string;
  code: string;
  isRecoveryCode: boolean;
  rememberDevice: boolean;
  userAgent: string;
  ip: string;
}): Promise<VerifyTwoFactorResult> {
  const { userId, code, isRecoveryCode, rememberDevice, userAgent, ip } = params;

  const userData = await findUserTwoFactorData(userId);
  if (!userData?.twoFactorEnabled || !userData.totpSecretEncrypted) {
    throw new InvalidTotpError();
  }

  if (isRecoveryCode) {
    // Valida recovery code
    const matchingHash = findMatchingRecoveryCodeHash(
      code,
      userData.twoFactorRecoveryCodeHashes
    );
    if (!matchingHash) throw new InvalidTotpError();
    // Remove o hash usado (single-use)
    await removeRecoveryCodeHash(userId, matchingHash);
  } else {
    // Valida código TOTP
    const secretBase32 = decryptSecret(userData.totpSecretEncrypted);
    const isValid = verifyTotpCode(code, secretBase32);
    if (!isValid) throw new InvalidTotpError();
  }

  // Cria registro TwoFactorVerification (consumido pelo jwt callback)
  const nonce = randomBytes(32).toString("hex");
  await createTwoFactorVerification(userId, nonce);

  // Cria trusted device se solicitado
  let trustedDeviceToken: string | undefined;
  if (rememberDevice) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await createTrustedDevice({ userId, tokenHash, userAgent, ip });
    trustedDeviceToken = rawToken;
  }

  return { nonce, trustedDeviceToken };
}

/**
 * Helpers TOTP usando a biblioteca `otpauth`.
 *
 * - 6 dígitos, SHA1, janela de 30s, tolerância de ±1 janela.
 * - O secret é armazenado em Base32 e criptografado com AES-256-GCM antes de ir ao DB.
 */

import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface TotpSetupResult {
  /** Secret em Base32 — armazenar CRIPTOGRAFADO no DB. */
  secretBase32: string;
  /** URI otpauth:// — usado para gerar o QR code. */
  otpauthUri: string;
  /** Data URL (base64 PNG) do QR code — retornado ao cliente. */
  qrDataUrl: string;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ISSUER = process.env.TOTP_ISSUER ?? "Projorg";
const DIGITS = 6;
const PERIOD = 30; // segundos
/** Tolerância: aceita códigos da janela anterior e seguinte (±1). */
const WINDOW = 1;

// ---------------------------------------------------------------------------
// Funções
// ---------------------------------------------------------------------------

/**
 * Gera um novo TOTP secret e retorna o QR code para o setup.
 * @param userEmail - Identificador do usuário no app de autenticação.
 */
export async function generateTotpSetup(userEmail: string): Promise<TotpSetupResult> {
  const secret = new OTPAuth.Secret({ size: 20 }); // 160 bits
  const secretBase32 = secret.base32;

  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD,
    secret,
  });

  const otpauthUri = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 2, width: 200 });

  return { secretBase32, otpauthUri, qrDataUrl };
}

/**
 * Verifica se um código TOTP de 6 dígitos é válido para o secret dado.
 * @param code - Código digitado pelo usuário (6 dígitos).
 * @param secretBase32 - Secret em Base32 (descriptografado do DB).
 * @returns true se válido, false caso contrário.
 */
export function verifyTotpCode(code: string, secretBase32: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  try {
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: DIGITS,
      period: PERIOD,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
    const delta = totp.validate({ token: code, window: WINDOW });
    return delta !== null;
  } catch {
    return false;
  }
}

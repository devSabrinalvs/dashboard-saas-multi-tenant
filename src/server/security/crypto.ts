/**
 * Criptografia AES-256-GCM para segredos do servidor (TOTP secrets).
 *
 * Formato do ciphertext armazenado: "<iv_hex>:<authTag_hex>:<data_hex>"
 *
 * TWO_FACTOR_ENCRYPTION_KEY deve ser 32 bytes em base64 (44 chars).
 * Gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;  // 96 bits — recomendado para GCM
const TAG_LENGTH = 16; // 128 bits authTag

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const raw = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TWO_FACTOR_ENCRYPTION_KEY não configurada em produção.");
    }
    // Dev fallback: chave derivada de uma constante (NÃO usar em prod)
    return createHash("sha256").update("dev-only-2fa-key-NOT-for-prod").digest();
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("TWO_FACTOR_ENCRYPTION_KEY deve ter exatamente 32 bytes (base64 de 32 bytes).");
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Criptografa um plaintext string com AES-256-GCM.
 * Retorna "<iv_hex>:<authTag_hex>:<ciphertext_hex>".
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Descriptografa um ciphertext produzido por `encrypt`.
 * Lança se a autenticação falhar ou o formato for inválido.
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de ciphertext inválido.");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  if (iv.length !== IV_LENGTH || authTag.length !== TAG_LENGTH) {
    throw new Error("IV ou authTag com tamanho inválido.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

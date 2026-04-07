/**
 * Recovery codes para 2FA.
 *
 * - Gerados como 8 códigos de formato "XXXX-XXXX" (hex uppercase).
 * - Armazenados como hash SHA-256 (sem salt — os próprios códigos já têm 32 bits de entropia cada).
 * - Exibidos apenas 1 vez durante o setup; depois disso, apenas hashes ficam no DB.
 * - Ao usar um código, o hash correspondente é removido do array.
 */

import { randomBytes, createHash } from "crypto";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const CODE_COUNT = 8;
const CODE_BYTES = 4; // 4 bytes = 8 chars hex

// ---------------------------------------------------------------------------
// Funções
// ---------------------------------------------------------------------------

/**
 * Gera `CODE_COUNT` recovery codes no formato "XXXX-XXXX".
 * Retorna os códigos em plaintext — exibir ao usuário e depois descartar.
 */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: CODE_COUNT }, () => {
    const raw = randomBytes(CODE_BYTES).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

/**
 * Computa o hash SHA-256 de um recovery code.
 * Remove hífens e normaliza para uppercase antes de hashar.
 */
export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/-/g, "").toUpperCase();
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Computa os hashes de todos os recovery codes.
 */
export function hashRecoveryCodes(codes: string[]): string[] {
  return codes.map(hashRecoveryCode);
}

/**
 * Verifica se um código digitado bate com algum dos hashes armazenados.
 * @returns O hash correspondente se válido, null caso contrário.
 */
export function findMatchingRecoveryCodeHash(
  inputCode: string,
  storedHashes: string[]
): string | null {
  const inputHash = hashRecoveryCode(inputCode);
  return storedHashes.find((h) => h === inputHash) ?? null;
}

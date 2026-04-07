import { randomBytes, createHash } from "crypto";

/**
 * Gera um token criptograficamente seguro (256 bits).
 * Retorna string hexadecimal de 64 caracteres.
 * Nunca deve ser armazenado diretamente — use hashToken() antes de salvar no DB.
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Retorna o hash SHA-256 do token raw.
 * É este hash que deve ser armazenado no banco de dados.
 * O token raw vai no link de email; o hash vai no DB.
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

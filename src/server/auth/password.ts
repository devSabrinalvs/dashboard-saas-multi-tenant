import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

function getPepper(): string {
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PASSWORD_PEPPER não está definido em produção.");
    }
    // Dev/test: retorna string vazia (sem pepper), mantendo compatibilidade
    return "";
  }
  return pepper;
}

/**
 * Gera o hash bcrypt de uma senha com pepper.
 * O pepper é concatenado à senha antes do hash para dificultar ataques
 * por dicionário caso o banco de dados seja comprometido sem o .env.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain + getPepper(), BCRYPT_COST);
}

/**
 * Verifica se uma senha em texto claro corresponde ao hash armazenado.
 * Usa o mesmo pepper aplicado no hashPassword.
 */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain + getPepper(), hash);
}

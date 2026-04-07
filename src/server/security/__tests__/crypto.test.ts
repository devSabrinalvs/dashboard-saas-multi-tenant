/**
 * Testes unitários — crypto.ts (AES-256-GCM encrypt/decrypt)
 */

import { encrypt as encryptSecret, decrypt as decryptSecret } from "@/server/security/crypto";

describe("encryptSecret / decryptSecret", () => {
  it("retorna uma string no formato iv:authTag:data (3 partes hex)", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    // cada parte deve ser hex válida
    for (const p of parts) {
      expect(p).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("decifra o texto original após criptografar", () => {
    const original = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptSecret(original);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(original);
  });

  it("gera IV diferente a cada chamada (não é determinístico)", () => {
    const a = encryptSecret("MYSECRET");
    const b = encryptSecret("MYSECRET");
    expect(a).not.toBe(b);
  });

  it("lança ao tentar decifrar dados corrompidos", () => {
    expect(() => decryptSecret("aabbcc:ddeeff:001122")).toThrow();
  });

  it("lança ao tentar decifrar formato inválido (partes faltando)", () => {
    expect(() => decryptSecret("invalido")).toThrow();
  });

  it("lança ao tentar decifrar string vazia", () => {
    expect(() => decryptSecret("")).toThrow();
  });
});

/**
 * Testes unitários — totp.ts
 * Nota: generateTotpSetup é async e usa QRCode; testamos verifyTotpCode + estrutura de output.
 */

import * as OTPAuth from "otpauth";
import { generateTotpSetup, verifyTotpCode } from "@/server/security/totp";

// ---------------------------------------------------------------------------
// generateTotpSetup
// ---------------------------------------------------------------------------

describe("generateTotpSetup", () => {
  it("retorna secretBase32, otpauthUri e qrDataUrl", async () => {
    const result = await generateTotpSetup("test@example.com");
    expect(result).toHaveProperty("secretBase32");
    expect(result).toHaveProperty("otpauthUri");
    expect(result).toHaveProperty("qrDataUrl");
  });

  it("secretBase32 é uma string Base32 válida (caracteres A-Z 2-7)", () => {
    return generateTotpSetup("user@test.com").then(({ secretBase32 }) => {
      expect(secretBase32).toMatch(/^[A-Z2-7]+=*$/);
    });
  });

  it("otpauthUri começa com otpauth://totp/", async () => {
    const { otpauthUri } = await generateTotpSetup("user@test.com");
    expect(otpauthUri).toMatch(/^otpauth:\/\/totp\//);
  });

  it("qrDataUrl é data URL PNG em base64", async () => {
    const { qrDataUrl } = await generateTotpSetup("user@test.com");
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("gera secrets diferentes a cada chamada", async () => {
    const a = await generateTotpSetup("user@test.com");
    const b = await generateTotpSetup("user@test.com");
    expect(a.secretBase32).not.toBe(b.secretBase32);
  });
});

// ---------------------------------------------------------------------------
// verifyTotpCode
// ---------------------------------------------------------------------------

describe("verifyTotpCode", () => {
  /** Gera um código TOTP válido para o secret dado (janela atual). */
  function generateValidCode(secretBase32: string): string {
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
    return totp.generate();
  }

  it("aceita código TOTP correto gerado com o mesmo secret", async () => {
    const { secretBase32 } = await generateTotpSetup("user@test.com");
    const code = generateValidCode(secretBase32);
    expect(verifyTotpCode(code, secretBase32)).toBe(true);
  });

  it("rejeita código incorreto", async () => {
    const { secretBase32 } = await generateTotpSetup("user@test.com");
    expect(verifyTotpCode("000000", secretBase32)).toBe(false);
  });

  it("rejeita código com menos de 6 dígitos", () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    expect(verifyTotpCode("12345", secret)).toBe(false);
  });

  it("rejeita código com mais de 6 dígitos", () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    expect(verifyTotpCode("1234567", secret)).toBe(false);
  });

  it("rejeita código com letras", () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    expect(verifyTotpCode("abc123", secret)).toBe(false);
  });

  it("rejeita código vazio", () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    expect(verifyTotpCode("", secret)).toBe(false);
  });

  it("rejeita código de secret diferente", async () => {
    const { secretBase32: secretA } = await generateTotpSetup("a@test.com");
    const { secretBase32: secretB } = await generateTotpSetup("b@test.com");
    const codeForA = generateValidCode(secretA);
    // Com alta probabilidade, código para A não é válido para B
    // (pode ter 1/1000000 de falhar, mas é aceitável em teste unitário)
    expect(verifyTotpCode(codeForA, secretB)).toBe(false);
  });
});

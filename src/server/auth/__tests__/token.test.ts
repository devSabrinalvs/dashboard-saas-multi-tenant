/**
 * Testes unitários — helpers de token (token.ts)
 */
import { generateToken, hashToken } from "@/server/auth/token";

describe("generateToken()", () => {
  it("retorna string hexadecimal de 64 caracteres", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("dois tokens gerados são diferentes (aleatoriedade)", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });

  it("gera 100 tokens sem repetições", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken()", () => {
  it("retorna string hexadecimal de 64 caracteres (SHA-256)", () => {
    const hash = hashToken("qualquer-token");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("é determinístico — mesma entrada → mesmo hash", () => {
    const raw = "token-de-teste-fixo";
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("entradas diferentes produzem hashes diferentes", () => {
    const h1 = hashToken("token-a");
    const h2 = hashToken("token-b");
    expect(h1).not.toBe(h2);
  });

  it("hash de token gerado é diferente do raw", () => {
    const raw = generateToken();
    const hash = hashToken(raw);
    expect(hash).not.toBe(raw);
  });

  it("roundtrip: generateToken → hashToken produz SHA-256 hex de 64 chars", () => {
    const raw = generateToken();
    const hash = hashToken(raw);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

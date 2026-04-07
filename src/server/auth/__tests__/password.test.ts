/**
 * Testes unitários — helpers de senha (password.ts)
 */
import { hashPassword, verifyPassword } from "@/server/auth/password";

// Jest já define NODE_ENV="test" — apenas garantir que pepper não está definido
beforeAll(() => {
  delete process.env.PASSWORD_PEPPER;
});

describe("hashPassword()", () => {
  it("retorna string não-vazia", async () => {
    const hash = await hashPassword("MinhaS3nh@");
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe("string");
  });

  it("hash começa com $2b$ (bcrypt)", async () => {
    const hash = await hashPassword("MinhaS3nh@");
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it("dois hashes da mesma senha são diferentes (salt aleatório)", async () => {
    const h1 = await hashPassword("MinhaS3nh@");
    const h2 = await hashPassword("MinhaS3nh@");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword()", () => {
  it("retorna true para senha correta", async () => {
    const hash = await hashPassword("MinhaS3nh@");
    const result = await verifyPassword("MinhaS3nh@", hash);
    expect(result).toBe(true);
  });

  it("retorna false para senha errada", async () => {
    const hash = await hashPassword("MinhaS3nh@");
    const result = await verifyPassword("SenhaErrada1!", hash);
    expect(result).toBe(false);
  });

  it("roundtrip completo: hash → verify → true", async () => {
    const plain = "SenhaComplexa#42";
    const hash = await hashPassword(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
  });

  it("roundtrip: senha ligeiramente diferente retorna false", async () => {
    const hash = await hashPassword("senha123!");
    expect(await verifyPassword("senha123 ", hash)).toBe(false);
    expect(await verifyPassword("Senha123!", hash)).toBe(false);
  });
});

describe("hashPassword() com pepper", () => {
  afterEach(() => {
    delete process.env.PASSWORD_PEPPER;
  });

  it("hash com pepper diferente invalida senha sem pepper", async () => {
    process.env.PASSWORD_PEPPER = "meu-pepper-secreto";
    const hash = await hashPassword("TesteSenha1!");
    // Verifica que a senha com pepper bate
    expect(await verifyPassword("TesteSenha1!", hash)).toBe(true);

    // Remove pepper — deve falhar
    delete process.env.PASSWORD_PEPPER;
    expect(await verifyPassword("TesteSenha1!", hash)).toBe(false);
  });
});

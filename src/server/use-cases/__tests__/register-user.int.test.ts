/**
 * Testes de integração — registerUser use-case
 *
 * O mailer usa ConsoleMailer (sem RESEND_API_KEY em .env.test).
 * Os testes verificam estado do banco, não a entrega do email.
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 */
import { registerUser } from "@/server/use-cases/register-user";
import { EmailAlreadyExistsError } from "@/server/errors/auth-errors";
import { testPrisma, resetDb } from "@tests/helpers/db";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("registerUser()", () => {
  it("cria usuário com emailVerified = null", async () => {
    await registerUser({ email: "novo@example.com", password: "Senha1!" });

    const user = await testPrisma.user.findUnique({
      where: { email: "novo@example.com" },
    });

    expect(user).not.toBeNull();
    expect(user?.emailVerified).toBeNull();
  });

  it("normaliza email para lowercase", async () => {
    await registerUser({ email: "UPPER@EXAMPLE.COM", password: "Senha1!" });

    const user = await testPrisma.user.findUnique({
      where: { email: "upper@example.com" },
    });
    expect(user).not.toBeNull();
  });

  it("cria token de verificação no banco (nunca o raw)", async () => {
    await registerUser({ email: "hash@example.com", password: "Senha1!" });

    const user = await testPrisma.user.findUnique({ where: { email: "hash@example.com" } });
    expect(user).not.toBeNull();

    const token = await testPrisma.emailVerificationToken.findFirst({
      where: { userId: user!.id },
    });

    expect(token).not.toBeNull();
    // tokenHash tem 64 chars (SHA-256 hex)
    expect(token!.tokenHash).toHaveLength(64);
    expect(token!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(token!.usedAt).toBeNull();
  });

  it("retorna o email normalizado", async () => {
    const result = await registerUser({ email: "Return@Example.com", password: "Senha1!" });
    expect(result.email).toBe("return@example.com");
  });

  it("lança EmailAlreadyExistsError para email duplicado", async () => {
    await registerUser({ email: "dup@example.com", password: "Senha1!" });

    await expect(
      registerUser({ email: "dup@example.com", password: "OutraSenha1!" })
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it("email duplicado (maiúsculas) também lança EmailAlreadyExistsError", async () => {
    await registerUser({ email: "dup2@example.com", password: "Senha1!" });

    await expect(
      registerUser({ email: "DUP2@EXAMPLE.COM", password: "OutraSenha1!" })
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it("cria token de verificação com expiração futura (+24h)", async () => {
    await registerUser({ email: "expiry@example.com", password: "Senha1!" });

    const user = await testPrisma.user.findUnique({ where: { email: "expiry@example.com" } });
    const token = await testPrisma.emailVerificationToken.findFirst({
      where: { userId: user!.id },
    });

    expect(token).not.toBeNull();
    expect(token!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    expect(token!.usedAt).toBeNull();
  });

  it("senha é armazenada como hash bcrypt (não texto claro)", async () => {
    await registerUser({ email: "pw@example.com", password: "Senha1!" });

    const user = await testPrisma.user.findUnique({ where: { email: "pw@example.com" } });
    expect(user?.password).not.toBe("Senha1!");
    expect(user?.password).toMatch(/^\$2[ab]\$/);
  });
});

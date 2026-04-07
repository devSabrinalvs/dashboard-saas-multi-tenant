/**
 * Testes de integração — resetPassword use-case
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 */
import { resetPassword } from "@/server/use-cases/reset-password";
import { InvalidTokenError } from "@/server/errors/auth-errors";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createTestPasswordResetToken,
} from "@tests/helpers/db";
import { generateToken } from "@/server/auth/token";
import { verifyPassword } from "@/server/auth/password";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("resetPassword()", () => {
  it("token válido → atualiza password no banco e marca token como usado", async () => {
    const user = await createTestUser("reset@example.com", { emailVerified: true });
    const rawToken = generateToken();
    const { tokenHash } = await createTestPasswordResetToken(user.id, rawToken);

    await resetPassword({ token: rawToken, newPassword: "NovaS3nh@" });

    // Token marcado como usado
    const tokenRecord = await testPrisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    expect(tokenRecord?.usedAt).not.toBeNull();

    // Password atualizado
    const updatedUser = await testPrisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser?.password).toBeDefined();
    const passwordUpdated = await verifyPassword("NovaS3nh@", updatedUser!.password!);
    expect(passwordUpdated).toBe(true);
  });

  it("senha antiga não funciona após reset", async () => {
    const user = await createTestUser("oldpassword@example.com", { emailVerified: true });
    const rawToken = generateToken();
    await createTestPasswordResetToken(user.id, rawToken);

    await resetPassword({ token: rawToken, newPassword: "NovaS3nh@" });

    const updatedUser = await testPrisma.user.findUnique({ where: { id: user.id } });
    const oldWorks = await verifyPassword("password123", updatedUser!.password!);
    expect(oldWorks).toBe(false);
  });

  it("token inválido (não existe) → lança InvalidTokenError", async () => {
    await createTestUser("invalid@example.com", { emailVerified: true });

    await expect(
      resetPassword({ token: "token-que-nao-existe", newPassword: "NovaS3nh@" })
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("token expirado → lança InvalidTokenError", async () => {
    const user = await createTestUser("expired@example.com", { emailVerified: true });
    const rawToken = generateToken();
    await createTestPasswordResetToken(user.id, rawToken, {
      expiresAt: new Date(Date.now() - 1000), // já expirado
    });

    await expect(
      resetPassword({ token: rawToken, newPassword: "NovaS3nh@" })
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("token já usado → lança InvalidTokenError", async () => {
    const user = await createTestUser("used@example.com", { emailVerified: true });
    const rawToken = generateToken();
    await createTestPasswordResetToken(user.id, rawToken, {
      usedAt: new Date(), // já marcado como usado
    });

    await expect(
      resetPassword({ token: rawToken, newPassword: "NovaS3nh@" })
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("segundo uso do mesmo token falha (token já usado após 1º reset)", async () => {
    const user = await createTestUser("double-use@example.com", { emailVerified: true });
    const rawToken = generateToken();
    await createTestPasswordResetToken(user.id, rawToken);

    // Primeiro uso: ok
    await expect(
      resetPassword({ token: rawToken, newPassword: "PrimeiraNovaSenha1!" })
    ).resolves.toEqual({ ok: true });

    // Segundo uso: deve falhar
    await expect(
      resetPassword({ token: rawToken, newPassword: "SegundaNovaSenha1!" })
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("retorna { ok: true } em caso de sucesso", async () => {
    const user = await createTestUser("okreturn@example.com", { emailVerified: true });
    const rawToken = generateToken();
    await createTestPasswordResetToken(user.id, rawToken);

    const result = await resetPassword({ token: rawToken, newPassword: "Resultado1!" });
    expect(result).toEqual({ ok: true });
  });

  it("reseta lockout — conta bloqueada volta a aceitar login após reset de senha", async () => {
    const user = await createTestUser("locked@example.com", {
      emailVerified: true,
      failedLoginCount: 10,
      lockedUntil: new Date(Date.now() + 60 * 60 * 1000), // bloqueada por 1h
    });
    const rawToken = generateToken();
    await createTestPasswordResetToken(user.id, rawToken);

    await resetPassword({ token: rawToken, newPassword: "NovaS3nh@" });

    const updatedUser = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.lockedUntil).toBeNull();
    expect(updatedUser?.failedLoginCount).toBe(0);
  });
});

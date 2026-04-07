/**
 * Testes de integração — forgotPassword use-case
 *
 * O mailer usa ConsoleMailer (sem RESEND_API_KEY em .env.test).
 * Os testes verificam estado do banco, não a entrega do email.
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 */
import { forgotPassword } from "@/server/use-cases/forgot-password";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createTestPasswordResetToken,
} from "@tests/helpers/db";
import { generateToken } from "@/server/auth/token";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("forgotPassword()", () => {
  it("email inexistente → void, 0 tokens criados", async () => {
    await expect(forgotPassword("naoexiste@example.com")).resolves.toBeUndefined();

    const count = await testPrisma.passwordResetToken.count();
    expect(count).toBe(0);
  });

  it("email não verificado → void, 0 tokens criados", async () => {
    await createTestUser("unverified@example.com");

    await expect(forgotPassword("unverified@example.com")).resolves.toBeUndefined();

    const count = await testPrisma.passwordResetToken.count();
    expect(count).toBe(0);
  });

  it("email verificado → cria PasswordResetToken com expiresAt ≈ +60min", async () => {
    const user = await createTestUser("verified@example.com", { emailVerified: true });

    await forgotPassword("verified@example.com");

    const token = await testPrisma.passwordResetToken.findFirst({
      where: { userId: user.id },
    });
    expect(token).not.toBeNull();
    expect(token?.usedAt).toBeNull();

    const nowMs = Date.now();
    const expiresMs = token!.expiresAt.getTime();
    // expiresAt deve ser entre +55min e +65min
    expect(expiresMs).toBeGreaterThan(nowMs + 55 * 60 * 1000);
    expect(expiresMs).toBeLessThan(nowMs + 65 * 60 * 1000);
  });

  it("token armazenado é hash SHA-256 de 64 chars hex", async () => {
    const user = await createTestUser("hash@example.com", { emailVerified: true });

    await forgotPassword("hash@example.com");

    const token = await testPrisma.passwordResetToken.findFirst({
      where: { userId: user.id },
    });
    expect(token?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("segunda chamada invalida o token anterior e cria novo", async () => {
    const user = await createTestUser("double@example.com", { emailVerified: true });
    const oldRawToken = generateToken();
    const { tokenHash: oldHash } = await createTestPasswordResetToken(user.id, oldRawToken);

    await forgotPassword("double@example.com");

    // Token antigo deve estar marcado como usado
    const oldToken = await testPrisma.passwordResetToken.findUnique({
      where: { tokenHash: oldHash },
    });
    expect(oldToken?.usedAt).not.toBeNull();

    // Novo token deve existir e estar válido
    const newToken = await testPrisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
    });
    expect(newToken).not.toBeNull();
  });

  it("nunca lança erro mesmo para email inexistente", async () => {
    await expect(forgotPassword("ghost@example.com")).resolves.toBeUndefined();
  });
});

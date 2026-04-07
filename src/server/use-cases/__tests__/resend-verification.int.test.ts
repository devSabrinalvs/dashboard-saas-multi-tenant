/**
 * Testes de integração — resendVerification use-case
 *
 * O mailer usa ConsoleMailer (sem RESEND_API_KEY em .env.test).
 * Os testes verificam estado do banco, não a entrega do email.
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 */
import { resendVerification } from "@/server/use-cases/resend-verification";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createTestVerificationToken,
} from "@tests/helpers/db";
import { generateToken } from "@/server/auth/token";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("resendVerification()", () => {
  it("usuário não verificado → cria novo token no banco", async () => {
    const user = await createTestUser("unverified@example.com");

    await resendVerification("unverified@example.com");

    const token = await testPrisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
    });
    expect(token).not.toBeNull();
    expect(token?.usedAt).toBeNull();
    expect(token!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("invalida tokens anteriores ao reenviar", async () => {
    const user = await createTestUser("multi@example.com");
    const oldRawToken = generateToken();
    const { tokenHash: oldHash } = await createTestVerificationToken(user.id, oldRawToken);

    await resendVerification("multi@example.com");

    // Token antigo deve estar marcado como usado
    const oldToken = await testPrisma.emailVerificationToken.findUnique({
      where: { tokenHash: oldHash },
    });
    expect(oldToken?.usedAt).not.toBeNull();

    // Novo token deve existir e estar válido
    const newToken = await testPrisma.emailVerificationToken.findFirst({
      where: { userId: user.id, usedAt: null },
    });
    expect(newToken).not.toBeNull();
  });

  it("email inexistente → não cria token e não lança erro", async () => {
    await expect(resendVerification("inexistente@example.com")).resolves.toBeUndefined();

    const tokenCount = await testPrisma.emailVerificationToken.count();
    expect(tokenCount).toBe(0);
  });

  it("usuário já verificado → não cria novo token", async () => {
    const user = await createTestUser("verified@example.com", { emailVerified: true });

    await resendVerification("verified@example.com");

    const token = await testPrisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
    });
    expect(token).toBeNull();
  });

  it("resposta genérica mesmo para email inexistente (sem throw)", async () => {
    await expect(resendVerification("ghost@example.com")).resolves.toBeUndefined();
  });

  it("normaliza email para lowercase antes de buscar", async () => {
    const user = await createTestUser("lower@example.com");

    await resendVerification("LOWER@EXAMPLE.COM");

    const token = await testPrisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
    });
    expect(token).not.toBeNull();
  });
});

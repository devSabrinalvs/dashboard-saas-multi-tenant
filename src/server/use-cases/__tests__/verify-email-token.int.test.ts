/**
 * Testes de integração — verifyEmailToken use-case
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 */
import { verifyEmailToken } from "@/server/use-cases/verify-email-token";
import { InvalidTokenError } from "@/server/errors/auth-errors";
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

describe("verifyEmailToken()", () => {
  it("token válido → seta emailVerified no user", async () => {
    const user = await createTestUser("verify@example.com");
    const rawToken = generateToken();
    await createTestVerificationToken(user.id, rawToken);

    await verifyEmailToken(rawToken);

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.emailVerified).not.toBeNull();
    expect(updated?.emailVerified).toBeInstanceOf(Date);
  });

  it("token válido → marca usedAt no token", async () => {
    const user = await createTestUser("mark-used@example.com");
    const rawToken = generateToken();
    const { tokenHash } = await createTestVerificationToken(user.id, rawToken);

    await verifyEmailToken(rawToken);

    const record = await testPrisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    expect(record?.usedAt).not.toBeNull();
    expect(record?.usedAt).toBeInstanceOf(Date);
  });

  it("token válido → retorna { ok: true }", async () => {
    const user = await createTestUser("ok@example.com");
    const rawToken = generateToken();
    await createTestVerificationToken(user.id, rawToken);

    const result = await verifyEmailToken(rawToken);
    expect(result).toEqual({ ok: true });
  });

  it("token inválido (inexistente) → lança InvalidTokenError", async () => {
    const rawToken = generateToken(); // não salvo no banco
    await expect(verifyEmailToken(rawToken)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("token expirado → lança InvalidTokenError", async () => {
    const user = await createTestUser("expired@example.com");
    const rawToken = generateToken();
    await createTestVerificationToken(user.id, rawToken, {
      expiresAt: new Date(Date.now() - 1000), // expirado
    });

    await expect(verifyEmailToken(rawToken)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("token já usado → lança InvalidTokenError", async () => {
    const user = await createTestUser("used@example.com");
    const rawToken = generateToken();
    await createTestVerificationToken(user.id, rawToken, {
      usedAt: new Date(), // já usado
    });

    await expect(verifyEmailToken(rawToken)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("token de outro usuário não verifica o usuário correto", async () => {
    const user1 = await createTestUser("user1@example.com");
    const user2 = await createTestUser("user2@example.com");

    const rawToken = generateToken();
    await createTestVerificationToken(user1.id, rawToken);

    await verifyEmailToken(rawToken);

    // user1 verificado
    const u1 = await testPrisma.user.findUnique({ where: { id: user1.id } });
    expect(u1?.emailVerified).not.toBeNull();

    // user2 intocado
    const u2 = await testPrisma.user.findUnique({ where: { id: user2.id } });
    expect(u2?.emailVerified).toBeNull();
  });

  it("usar token duas vezes falha na segunda tentativa", async () => {
    const user = await createTestUser("double@example.com");
    const rawToken = generateToken();
    await createTestVerificationToken(user.id, rawToken);

    await verifyEmailToken(rawToken); // 1ª vez: OK

    await expect(verifyEmailToken(rawToken)).rejects.toBeInstanceOf(InvalidTokenError); // 2ª vez: falha
  });
});

/**
 * Testes de integração — verify-two-factor-login use-case
 *
 * Cobre:
 * - Verificação com código TOTP válido
 * - Verificação com recovery code (single-use)
 * - Criação de TwoFactorVerification no DB (e consumo via consumeTwoFactorVerification)
 * - Criação de TrustedDevice (rememberDevice=true)
 * - Erros: TOTP inválido, recovery code inválido
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 */

import { createHash } from "crypto";
import * as OTPAuth from "otpauth";
import { verifyTwoFactorLogin } from "@/server/use-cases/verify-two-factor-login";
import { consumeTwoFactorVerification } from "@/server/repo/two-factor-repo";
import {
  initTwoFactorSetup,
  confirmTwoFactorSetup,
} from "@/server/use-cases/setup-two-factor";
import { InvalidTotpError } from "@/server/errors/auth-errors";
import { testPrisma, resetDb, createTestUser } from "@tests/helpers/db";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

function generateCode(secretBase32: string): string {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  return totp.generate();
}

/** Helper: cria usuário com 2FA ativo. Retorna user, secretBase32, recoveryCodes. */
async function create2FAUser(email = "2fa@example.com") {
  const user = await createTestUser(email, { emailVerified: true });
  const { secretBase32 } = await initTwoFactorSetup(user.id, user.email);
  const code = generateCode(secretBase32);
  const { recoveryCodes } = await confirmTwoFactorSetup(user.id, code);
  return { user, secretBase32, recoveryCodes };
}

const mockCtx = { userAgent: "test-agent", ip: "127.0.0.1" };

// ---------------------------------------------------------------------------
// TOTP verification
// ---------------------------------------------------------------------------

describe("verifyTwoFactorLogin() — TOTP", () => {
  it("retorna nonce para código TOTP válido", async () => {
    const { user, secretBase32 } = await create2FAUser();
    const code = generateCode(secretBase32);

    const result = await verifyTwoFactorLogin({
      userId: user.id,
      code,
      isRecoveryCode: false,
      rememberDevice: false,
      ...mockCtx,
    });

    expect(result.nonce).toBeTruthy();
    expect(typeof result.nonce).toBe("string");
    expect(result.trustedDeviceToken).toBeUndefined();
  });

  it("cria TwoFactorVerification no banco com nonce retornado", async () => {
    const { user, secretBase32 } = await create2FAUser();
    const code = generateCode(secretBase32);

    const { nonce } = await verifyTwoFactorLogin({
      userId: user.id,
      code,
      isRecoveryCode: false,
      rememberDevice: false,
      ...mockCtx,
    });

    // consumeTwoFactorVerification deve retornar true e deletar o registro
    const consumed = await consumeTwoFactorVerification(user.id, nonce);
    expect(consumed).toBe(true);

    // Segunda tentativa com o mesmo nonce deve falhar (single-use)
    const consumedAgain = await consumeTwoFactorVerification(user.id, nonce);
    expect(consumedAgain).toBe(false);
  });

  it("lança InvalidTotpError para código TOTP errado", async () => {
    const { user } = await create2FAUser();

    await expect(
      verifyTwoFactorLogin({
        userId: user.id,
        code: "000000",
        isRecoveryCode: false,
        rememberDevice: false,
        ...mockCtx,
      })
    ).rejects.toBeInstanceOf(InvalidTotpError);
  });

  it("lança InvalidTotpError se usuário não tem 2FA ativo", async () => {
    const user = await createTestUser("no2fa@example.com", { emailVerified: true });

    await expect(
      verifyTwoFactorLogin({
        userId: user.id,
        code: "123456",
        isRecoveryCode: false,
        rememberDevice: false,
        ...mockCtx,
      })
    ).rejects.toBeInstanceOf(InvalidTotpError);
  });
});

// ---------------------------------------------------------------------------
// Recovery code verification
// ---------------------------------------------------------------------------

describe("verifyTwoFactorLogin() — recovery code", () => {
  it("aceita recovery code válido e retorna nonce", async () => {
    const { user, recoveryCodes } = await create2FAUser();

    const result = await verifyTwoFactorLogin({
      userId: user.id,
      code: recoveryCodes[0],
      isRecoveryCode: true,
      rememberDevice: false,
      ...mockCtx,
    });

    expect(result.nonce).toBeTruthy();
  });

  it("remove o recovery code usado (single-use)", async () => {
    const { user, recoveryCodes } = await create2FAUser();
    const usedCode = recoveryCodes[0];

    await verifyTwoFactorLogin({
      userId: user.id,
      code: usedCode,
      isRecoveryCode: true,
      rememberDevice: false,
      ...mockCtx,
    });

    // Tentativa de usar o mesmo código novamente deve falhar
    await expect(
      verifyTwoFactorLogin({
        userId: user.id,
        code: usedCode,
        isRecoveryCode: true,
        rememberDevice: false,
        ...mockCtx,
      })
    ).rejects.toBeInstanceOf(InvalidTotpError);

    // Restam 7 códigos no banco
    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorRecoveryCodeHashes: true },
    });
    expect(dbUser?.twoFactorRecoveryCodeHashes).toHaveLength(7);
  });

  it("lança InvalidTotpError para recovery code inválido", async () => {
    const { user } = await create2FAUser();

    await expect(
      verifyTwoFactorLogin({
        userId: user.id,
        code: "ZZZZ-ZZZZ",
        isRecoveryCode: true,
        rememberDevice: false,
        ...mockCtx,
      })
    ).rejects.toBeInstanceOf(InvalidTotpError);
  });
});

// ---------------------------------------------------------------------------
// rememberDevice
// ---------------------------------------------------------------------------

describe("verifyTwoFactorLogin() — rememberDevice", () => {
  it("cria TrustedDevice e retorna trustedDeviceToken quando rememberDevice=true", async () => {
    const { user, secretBase32 } = await create2FAUser("remember@example.com");
    const code = generateCode(secretBase32);

    const result = await verifyTwoFactorLogin({
      userId: user.id,
      code,
      isRecoveryCode: false,
      rememberDevice: true,
      ...mockCtx,
    });

    expect(result.trustedDeviceToken).toBeTruthy();

    // Hash do token deve estar no banco
    const tokenHash = createHash("sha256").update(result.trustedDeviceToken!).digest("hex");
    const device = await testPrisma.trustedDevice.findFirst({
      where: { userId: user.id, tokenHash },
    });
    expect(device).not.toBeNull();
    expect(device?.userAgent).toBe(mockCtx.userAgent);
    expect(device?.ip).toBe(mockCtx.ip);
  });

  it("NÃO cria TrustedDevice quando rememberDevice=false", async () => {
    const { user, secretBase32 } = await create2FAUser("noremember@example.com");
    const code = generateCode(secretBase32);

    const result = await verifyTwoFactorLogin({
      userId: user.id,
      code,
      isRecoveryCode: false,
      rememberDevice: false,
      ...mockCtx,
    });

    expect(result.trustedDeviceToken).toBeUndefined();

    const deviceCount = await testPrisma.trustedDevice.findFirst({
      where: { userId: user.id },
    });
    expect(deviceCount).toBeNull();
  });
});

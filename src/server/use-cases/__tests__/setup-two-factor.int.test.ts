/**
 * Testes de integração — setup-two-factor use-case
 *
 * Testa o fluxo completo de ativação/desativação do 2FA:
 * initTwoFactorSetup → confirmTwoFactorSetup → disableTwoFactorSetup
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 */

import * as OTPAuth from "otpauth";
import { decrypt } from "@/server/security/crypto";
import {
  initTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactorSetup,
} from "@/server/use-cases/setup-two-factor";
import { InvalidTotpError, TwoFactorNotEnabledError } from "@/server/errors/auth-errors";
import { testPrisma, resetDb, createTestUser } from "@tests/helpers/db";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

/** Gera um código TOTP válido para um secret Base32. */
function generateCode(secretBase32: string): string {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  return totp.generate();
}

// ---------------------------------------------------------------------------
// initTwoFactorSetup
// ---------------------------------------------------------------------------

describe("initTwoFactorSetup()", () => {
  it("salva twoFactorTempSecretEncrypted no banco", async () => {
    const user = await createTestUser("init@example.com", { emailVerified: true });

    await initTwoFactorSetup(user.id, user.email);

    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorTempSecretEncrypted: true, twoFactorEnabled: true },
    });

    expect(dbUser?.twoFactorTempSecretEncrypted).not.toBeNull();
    expect(dbUser?.twoFactorEnabled).toBe(false);
  });

  it("retorna qrDataUrl e secretBase32 válidos", async () => {
    const user = await createTestUser("qr@example.com", { emailVerified: true });
    const result = await initTwoFactorSetup(user.id, user.email);

    expect(result.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.secretBase32).toMatch(/^[A-Z2-7]+=*$/);
  });

  it("o secret retornado corresponde ao armazenado no DB (após decrypt)", async () => {
    const user = await createTestUser("match@example.com", { emailVerified: true });
    const { secretBase32 } = await initTwoFactorSetup(user.id, user.email);

    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorTempSecretEncrypted: true },
    });

    const decrypted = decrypt(dbUser!.twoFactorTempSecretEncrypted!);
    expect(decrypted).toBe(secretBase32);
  });
});

// ---------------------------------------------------------------------------
// confirmTwoFactorSetup
// ---------------------------------------------------------------------------

describe("confirmTwoFactorSetup()", () => {
  async function setupUser() {
    const user = await createTestUser("confirm@example.com", { emailVerified: true });
    const { secretBase32 } = await initTwoFactorSetup(user.id, user.email);
    return { user, secretBase32 };
  }

  it("ativa twoFactorEnabled e move tempSecret → totpSecret", async () => {
    const { user, secretBase32 } = await setupUser();
    const code = generateCode(secretBase32);

    await confirmTwoFactorSetup(user.id, code);

    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: {
        twoFactorEnabled: true,
        totpSecretEncrypted: true,
        twoFactorTempSecretEncrypted: true,
        twoFactorEnabledAt: true,
      },
    });

    expect(dbUser?.twoFactorEnabled).toBe(true);
    expect(dbUser?.totpSecretEncrypted).not.toBeNull();
    expect(dbUser?.twoFactorTempSecretEncrypted).toBeNull();
    expect(dbUser?.twoFactorEnabledAt).not.toBeNull();
  });

  it("retorna 8 recovery codes em plaintext no formato XXXX-XXXX", async () => {
    const { user, secretBase32 } = await setupUser();
    const code = generateCode(secretBase32);

    const { recoveryCodes } = await confirmTwoFactorSetup(user.id, code);

    expect(recoveryCodes).toHaveLength(8);
    for (const c of recoveryCodes) {
      expect(c).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    }
  });

  it("salva hashes dos recovery codes no banco (não plaintext)", async () => {
    const { user, secretBase32 } = await setupUser();
    const code = generateCode(secretBase32);

    const { recoveryCodes } = await confirmTwoFactorSetup(user.id, code);

    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorRecoveryCodeHashes: true },
    });

    // Hashes existem e não são os códigos em plaintext
    expect(dbUser?.twoFactorRecoveryCodeHashes).toHaveLength(8);
    for (const plainCode of recoveryCodes) {
      expect(dbUser?.twoFactorRecoveryCodeHashes).not.toContain(plainCode);
    }
  });

  it("lança InvalidTotpError para código TOTP incorreto", async () => {
    const { user } = await setupUser();

    await expect(confirmTwoFactorSetup(user.id, "000000")).rejects.toBeInstanceOf(
      InvalidTotpError
    );
  });

  it("lança InvalidTotpError se tempSecret não existe", async () => {
    const user = await createTestUser("notmp@example.com", { emailVerified: true });

    await expect(confirmTwoFactorSetup(user.id, "123456")).rejects.toBeInstanceOf(
      InvalidTotpError
    );
  });
});

// ---------------------------------------------------------------------------
// disableTwoFactorSetup
// ---------------------------------------------------------------------------

describe("disableTwoFactorSetup()", () => {
  async function enabledUser() {
    const user = await createTestUser("disable@example.com", { emailVerified: true });
    const { secretBase32 } = await initTwoFactorSetup(user.id, user.email);
    const code = generateCode(secretBase32);
    await confirmTwoFactorSetup(user.id, code);
    return { user, secretBase32 };
  }

  it("desativa 2FA e limpa os dados", async () => {
    const { user, secretBase32 } = await enabledUser();
    const code = generateCode(secretBase32);

    await disableTwoFactorSetup(user.id, code);

    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: {
        twoFactorEnabled: true,
        totpSecretEncrypted: true,
        twoFactorRecoveryCodeHashes: true,
      },
    });

    expect(dbUser?.twoFactorEnabled).toBe(false);
    expect(dbUser?.totpSecretEncrypted).toBeNull();
    expect(dbUser?.twoFactorRecoveryCodeHashes).toHaveLength(0);
  });

  it("lança InvalidTotpError para código incorreto", async () => {
    const { user } = await enabledUser();

    await expect(disableTwoFactorSetup(user.id, "000000")).rejects.toBeInstanceOf(
      InvalidTotpError
    );
  });

  it("lança TwoFactorNotEnabledError se 2FA não estiver ativo", async () => {
    const user = await createTestUser("nodisable@example.com", { emailVerified: true });

    await expect(disableTwoFactorSetup(user.id, "123456")).rejects.toBeInstanceOf(
      TwoFactorNotEnabledError
    );
  });
});

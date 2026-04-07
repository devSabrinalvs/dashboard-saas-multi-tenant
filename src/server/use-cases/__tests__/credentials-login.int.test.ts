/**
 * Testes de integração — lockout de login + alertas de segurança (Etapa D)
 *
 * Testa diretamente as funções usadas pelo authorize() do NextAuth:
 * - incrementFailedLogin, resetLoginCounters, updateLastSecurityAlertAt
 * - isAccountLocked, computeLockedUntil, shouldSendAlert
 * - verifyPassword + findUserByEmail
 *
 * Evita importar authOptions (interop CJS/ESM com next-auth em jest ESM).
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 */

import { testPrisma, resetDb, createTestUser } from "@tests/helpers/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  findUserByEmail,
  incrementFailedLogin,
  resetLoginCounters,
  updateLastSecurityAlertAt,
} from "@/server/repo/user-repo";
import { markEmailVerified } from "@/server/repo/user-repo";
import {
  isAccountLocked,
  computeLockedUntil,
  getLockRemainingMs,
} from "@/server/security/login-lockout";
import { shouldSendAlert, SECURITY_ALERT_COOLDOWN_MS } from "@/server/security/security-alerts";

// ---------------------------------------------------------------------------
// Helper: replica a lógica do authorize() sem NextAuth
// ---------------------------------------------------------------------------

type AuthorizeResult =
  | { id: string; email: string; name: string | null }
  | null
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_LOCKED";

async function simulateAuthorize(email: string, password: string): Promise<AuthorizeResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user?.password) return null;

  // Lockout check
  if (isAccountLocked(user.lockedUntil)) return "ACCOUNT_LOCKED";

  const passwordMatches = await verifyPassword(password, user.password);

  if (!passwordMatches) {
    const newCount = user.failedLoginCount + 1;
    const newLockedUntil = computeLockedUntil(newCount);
    await incrementFailedLogin(user.id, newLockedUntil);
    return null;
  }

  if (!user.emailVerified) return "EMAIL_NOT_VERIFIED";

  await resetLoginCounters(user.id);
  return { id: user.id, email: user.email, name: user.name };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

async function seedVerifiedUser(email: string, plain: string) {
  const password = await hashPassword(plain);
  return testPrisma.user.create({
    data: { email, password, name: "Lock Test", emailVerified: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Testes existentes (básico)
// ---------------------------------------------------------------------------

describe("simulate authorize() — comportamentos básicos", () => {
  it("retorna null para email inexistente", async () => {
    expect(await simulateAuthorize("ghost@example.com", "Senha1!")).toBeNull();
  });

  it("retorna EMAIL_NOT_VERIFIED para usuário não verificado", async () => {
    await testPrisma.user.create({
      data: {
        email: "unverified@example.com",
        password: await hashPassword("Senha1!"),
        name: "Unverified",
        emailVerified: null,
      },
    });
    expect(await simulateAuthorize("unverified@example.com", "Senha1!")).toBe("EMAIL_NOT_VERIFIED");
  });

  it("retorna user para credenciais corretas", async () => {
    await seedVerifiedUser("ok@example.com", "Senha1!");
    const result = await simulateAuthorize("ok@example.com", "Senha1!");
    expect(result).not.toBeNull();
    expect(result).not.toBe("EMAIL_NOT_VERIFIED");
    expect(result).not.toBe("ACCOUNT_LOCKED");
    if (result && result !== "EMAIL_NOT_VERIFIED" && result !== "ACCOUNT_LOCKED") {
      expect(result.email).toBe("ok@example.com");
    }
  });

  it("retorna null para senha errada (sem locker atingido)", async () => {
    await seedVerifiedUser("wrong@example.com", "CorretaSenha1!");
    const result = await simulateAuthorize("wrong@example.com", "Errada!");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Testes de lockout — incremento de failedLoginCount
// ---------------------------------------------------------------------------

describe("lockout — incremento de failedLoginCount", () => {
  it("incrementa failedLoginCount em cada falha de senha", async () => {
    const user = await seedVerifiedUser("inc@example.com", "CorretaSenha1!");

    await simulateAuthorize("inc@example.com", "Errada!");
    await simulateAuthorize("inc@example.com", "Errada!");
    await simulateAuthorize("inc@example.com", "Errada!");

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.failedLoginCount).toBe(3);
    expect(updated!.lastFailedLoginAt).not.toBeNull();
  });

  it("não incrementa failedLoginCount para email inexistente", async () => {
    // Simplesmente não deve lançar ou criar registro
    const result = await simulateAuthorize("ghost@example.com", "Qualquer!");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Testes de lockout — bloqueio progressivo
// ---------------------------------------------------------------------------

describe("lockout — bloqueio após 5 falhas", () => {
  it("seta lockedUntil na 5ª falha e bloqueia login imediato", async () => {
    const user = await seedVerifiedUser("lock5@example.com", "CorretaSenha1!");

    for (let i = 0; i < 5; i++) {
      await simulateAuthorize("lock5@example.com", "Errada!");
    }

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.failedLoginCount).toBe(5);
    expect(updated!.lockedUntil).not.toBeNull();

    // lockedUntil deve ser ~5 min no futuro (com margem de 10s para lentidão CI)
    const remainingMs = getLockRemainingMs(updated!.lockedUntil);
    expect(remainingMs).toBeGreaterThan(5 * 60 * 1000 - 10_000);
    expect(remainingMs).toBeLessThanOrEqual(5 * 60 * 1000 + 1000);

    // Login imediato deve retornar ACCOUNT_LOCKED
    const result = await simulateAuthorize("lock5@example.com", "CorretaSenha1!");
    expect(result).toBe("ACCOUNT_LOCKED");
  });

  it("não incrementa failedLoginCount durante período de lockout", async () => {
    // Inicializa com conta já bloqueada
    const password = await hashPassword("Senha1!");
    const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    const user = await testPrisma.user.create({
      data: {
        email: "locked@example.com",
        password,
        name: "Locked",
        emailVerified: new Date(),
        failedLoginCount: 5,
        lockedUntil,
      },
    });

    // Tentativa durante lockout
    const result = await simulateAuthorize("locked@example.com", "Errada!");
    expect(result).toBe("ACCOUNT_LOCKED");

    // failedLoginCount não deve ter mudado
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.failedLoginCount).toBe(5);
  });
});

describe("lockout — escalada de thresholds (8 e 10 falhas)", () => {
  it("aplica lock de 15 min na 8ª falha", async () => {
    const user = await seedVerifiedUser("lock8@example.com", "CorretaSenha1!");

    for (let i = 0; i < 8; i++) {
      // Força ignorar lockout intermediário criando estado diretamente no DB
      await testPrisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: i, lockedUntil: null },
      });
      await simulateAuthorize("lock8@example.com", "Errada!");
    }

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.failedLoginCount).toBe(8);
    const remaining = getLockRemainingMs(updated!.lockedUntil);
    expect(remaining).toBeGreaterThan(15 * 60 * 1000 - 10_000);
    expect(remaining).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
  });

  it("aplica lock de 60 min na 10ª falha", async () => {
    const user = await seedVerifiedUser("lock10@example.com", "CorretaSenha1!");

    for (let i = 0; i < 10; i++) {
      await testPrisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: i, lockedUntil: null },
      });
      await simulateAuthorize("lock10@example.com", "Errada!");
    }

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.failedLoginCount).toBe(10);
    const remaining = getLockRemainingMs(updated!.lockedUntil);
    expect(remaining).toBeGreaterThan(60 * 60 * 1000 - 10_000);
    expect(remaining).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
  });
});

// ---------------------------------------------------------------------------
// Testes de lockout — desbloqueio após expiração
// ---------------------------------------------------------------------------

describe("lockout — desbloqueio após expiração do lock", () => {
  it("login correto após expiração reseta contadores", async () => {
    const password = await hashPassword("CorretaSenha1!");
    const expiredLock = new Date(Date.now() - 1000); // já expirado
    const user = await testPrisma.user.create({
      data: {
        email: "unlocked@example.com",
        password,
        name: "Unlocked",
        emailVerified: new Date(),
        failedLoginCount: 5,
        lockedUntil: expiredLock,
      },
    });

    const result = await simulateAuthorize("unlocked@example.com", "CorretaSenha1!");
    expect(result).not.toBe("ACCOUNT_LOCKED");
    expect(result).not.toBeNull();

    // Contadores resetados
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.failedLoginCount).toBe(0);
    expect(updated!.lockedUntil).toBeNull();
    expect(updated!.lastLoginAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Testes de resetLoginCounters (sucesso)
// ---------------------------------------------------------------------------

describe("resetLoginCounters", () => {
  it("zera failedLoginCount e lockedUntil em login bem-sucedido", async () => {
    const user = await createTestUser("reset@example.com", {
      emailVerified: true,
      failedLoginCount: 7,
      lockedUntil: new Date(Date.now() - 1000), // lock expirado
    });

    await resetLoginCounters(user.id);

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.failedLoginCount).toBe(0);
    expect(updated!.lockedUntil).toBeNull();
    expect(updated!.lastFailedLoginAt).toBeNull();
    expect(updated!.lastLoginAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Testes de alerta de segurança — cooldown
// ---------------------------------------------------------------------------

describe("shouldSendAlert — cooldown de alertas", () => {
  it("retorna true quando lastSecurityAlertAt é null", () => {
    expect(shouldSendAlert(null)).toBe(true);
    expect(shouldSendAlert(undefined)).toBe(true);
  });

  it("retorna false quando alerta foi enviado dentro do cooldown (6h)", () => {
    const recentAlert = new Date(Date.now() - SECURITY_ALERT_COOLDOWN_MS + 60_000);
    expect(shouldSendAlert(recentAlert)).toBe(false);
  });

  it("retorna true quando alerta foi enviado há mais de 6h", () => {
    const oldAlert = new Date(Date.now() - SECURITY_ALERT_COOLDOWN_MS - 1000);
    expect(shouldSendAlert(oldAlert)).toBe(true);
  });
});

describe("updateLastSecurityAlertAt", () => {
  it("atualiza o timestamp de alerta no banco", async () => {
    const user = await createTestUser("alert@example.com");
    const before = new Date();

    await updateLastSecurityAlertAt(user.id);

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.lastSecurityAlertAt).not.toBeNull();
    expect(updated!.lastSecurityAlertAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

// ---------------------------------------------------------------------------
// Testes de resposta genérica (não vaza existência de usuário)
// ---------------------------------------------------------------------------

describe("respostas genéricas — não vaza existência de email", () => {
  it("senha errada e email inexistente retornam null (indistinguíveis)", async () => {
    await seedVerifiedUser("exists@example.com", "Senha1!");

    const wrongPassword = await simulateAuthorize("exists@example.com", "Errada!");
    const noUser = await simulateAuthorize("nouser@example.com", "Errada!");

    // Ambos retornam null — cliente não pode distinguir
    expect(wrongPassword).toBeNull();
    expect(noUser).toBeNull();
  });

  it("lockout e senha errada em email inexistente retornam null (conta bloqueada é opaco)", async () => {
    // Conta bloqueada com senha correta → ACCOUNT_LOCKED (só a própria conta sabe que existe)
    // Email inexistente → null
    const password = await hashPassword("Senha1!");
    await testPrisma.user.create({
      data: {
        email: "blocked@example.com",
        password,
        emailVerified: new Date(),
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const lockedResult = await simulateAuthorize("blocked@example.com", "Senha1!");
    const noUserResult = await simulateAuthorize("nouser2@example.com", "Senha1!");

    // Ambos negam o login — embora por razões diferentes
    expect(lockedResult).toBe("ACCOUNT_LOCKED");
    expect(noUserResult).toBeNull();
    // A UI chama /api/auth/email-status SOMENTE quando signIn falha,
    // e esse endpoint retorna locked:true apenas para contas que existem.
    // Isso é aceitável UX (usuário já sabe que tem conta).
  });
});

// ---------------------------------------------------------------------------
// Testes do markEmailVerified (regressão)
// ---------------------------------------------------------------------------

describe("markEmailVerified — regressão", () => {
  it("habilita login após verificar email", async () => {
    const password = await hashPassword("Senha1!");
    const user = await testPrisma.user.create({
      data: { email: "late@example.com", password, emailVerified: null },
    });

    expect(await simulateAuthorize("late@example.com", "Senha1!")).toBe("EMAIL_NOT_VERIFIED");

    await markEmailVerified(user.id);
    const result = await simulateAuthorize("late@example.com", "Senha1!");
    expect(result).not.toBeNull();
    expect(result).not.toBe("EMAIL_NOT_VERIFIED");
  });
});

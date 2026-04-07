/**
 * Testes de regressão de segurança — Etapa H
 *
 * Cobre:
 * 1. Cross-tenant: updateProject/deleteTask via use-case com orgId errado
 * 2. Enumeração: forgotPassword e resendVerification retornam mesmo status
 *    para email existente e inexistente
 * 3. Token reutilização: password reset token só pode ser usado uma vez
 * 4. Token expirado: token expirado é rejeitado
 * 5. Sessão de usuário deletado: revokedAt definido após soft-delete
 */

import { forgotPassword } from "@/server/use-cases/forgot-password";
import { resetPassword } from "@/server/use-cases/reset-password";
import { resendVerification } from "@/server/use-cases/resend-verification";
import { deleteAccount } from "@/server/use-cases/delete-account";
import { updateProject } from "@/server/use-cases/update-project";
import { deleteTask } from "@/server/use-cases/delete-task";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
import { TaskNotFoundError } from "@/server/errors/project-errors";
import { InvalidTokenError } from "@/server/errors/auth-errors";
import { Role } from "@/generated/prisma/enums";
import type { OrgContext } from "@/server/org/require-org-context";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
  createTestProject,
  createTestTask,
  createTestPasswordResetToken,
} from "@tests/helpers/db";
import { hashToken } from "@/server/auth/token";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Helper: OrgContext falso
// ---------------------------------------------------------------------------

function makeCtx(
  userId: string,
  email: string,
  org: { id: string; slug: string; name: string },
  role: Role = Role.OWNER
): OrgContext {
  return { userId, email, orgId: org.id, orgSlug: org.slug, orgName: org.name, role, plan: "FREE" };
}

// ---------------------------------------------------------------------------
// 1. Cross-tenant — use-cases bloqueiam acesso a recursos de outra org
// ---------------------------------------------------------------------------

describe("Cross-tenant — updateProject via use-case", () => {
  it("lança ProjectNotFoundError ao atualizar projeto de outra org", async () => {
    const user    = await createTestUser("ct-up@sec.com");
    const orgA    = await createOrgWithMembership(user.id, "ct-up-a");
    const orgB    = await createOrgWithMembership(user.id, "ct-up-b");
    const project = await createTestProject(orgA.id, { name: "Original" });
    const ctxB    = makeCtx(user.id, user.email, orgB);

    await expect(
      updateProject(ctxB, project.id, { name: "Hackeado" })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);

    // Projeto de A não deve ter sido modificado
    const p = await testPrisma.project.findUnique({ where: { id: project.id } });
    expect(p?.name).toBe("Original");
  });
});

describe("Cross-tenant — deleteTask via use-case", () => {
  it("lança TaskNotFoundError ao deletar task de outra org", async () => {
    const user    = await createTestUser("ct-dt@sec.com");
    const orgA    = await createOrgWithMembership(user.id, "ct-dt-a");
    const orgB    = await createOrgWithMembership(user.id, "ct-dt-b");
    const projA   = await createTestProject(orgA.id, { name: "ProjA" });
    const task    = await createTestTask(orgA.id, projA.id, { title: "Task A" });
    const ctxB    = makeCtx(user.id, user.email, orgB);

    await expect(
      deleteTask(ctxB, task.id)
    ).rejects.toBeInstanceOf(TaskNotFoundError);

    // Task de A deve ainda existir
    const t = await testPrisma.task.findUnique({ where: { id: task.id } });
    expect(t).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Enumeração — forgotPassword não revela existência do email
// ---------------------------------------------------------------------------

describe("Enumeração — forgotPassword", () => {
  it("não lança para email inexistente (resposta idêntica)", async () => {
    // Ambas as chamadas devem completar sem erro
    await expect(forgotPassword("naoexiste@nowhere.com")).resolves.toBeUndefined();
  });

  it("não lança para email existente não verificado", async () => {
    await createTestUser("unverified@sec.com", { emailVerified: false });
    await expect(forgotPassword("unverified@sec.com")).resolves.toBeUndefined();
    // Nenhum token deve ter sido criado
    const token = await testPrisma.passwordResetToken.findFirst({});
    expect(token).toBeNull();
  });

  it("cria token para email verificado (sem revelar via API)", async () => {
    await createTestUser("verified@sec.com", { emailVerified: true });
    // A resposta ainda é void — mas desta vez cria o token internamente
    await expect(forgotPassword("verified@sec.com")).resolves.toBeUndefined();
    const token = await testPrisma.passwordResetToken.findFirst({});
    expect(token).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Enumeração — resendVerification não revela existência do email
// ---------------------------------------------------------------------------

describe("Enumeração — resendVerificationEmail", () => {
  it("não lança para email inexistente", async () => {
    await expect(
      resendVerification("ghost@nowhere.com")
    ).resolves.toBeUndefined();
  });

  it("não lança para email já verificado", async () => {
    await createTestUser("already@sec.com", { emailVerified: true });
    await expect(
      resendVerification("already@sec.com")
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Token reutilização — password reset token só pode ser usado uma vez
// ---------------------------------------------------------------------------

describe("Token reutilização — resetPassword", () => {
  it("segunda chamada com mesmo token lança InvalidTokenError", async () => {
    const user     = await createTestUser("reuse@sec.com", { emailVerified: true });
    const rawToken = "test-raw-token-not-guessable-12345";
    await createTestPasswordResetToken(user.id, rawToken);

    // Primeira chamada → sucesso
    await resetPassword({ token: rawToken, newPassword: "NewPassword1!" });

    // Segunda chamada → token já foi marcado como usado
    await expect(
      resetPassword({ token: rawToken, newPassword: "AnotherPass1!" })
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });
});

// ---------------------------------------------------------------------------
// 5. Token expirado — token expirado é rejeitado
// ---------------------------------------------------------------------------

describe("Token expirado — resetPassword", () => {
  it("token expirado lança InvalidTokenError", async () => {
    const user     = await createTestUser("expired@sec.com", { emailVerified: true });
    const rawToken = "expired-token-12345678901234567890";
    await createTestPasswordResetToken(user.id, rawToken, {
      expiresAt: new Date(Date.now() - 1000), // expirado 1 segundo atrás
    });

    await expect(
      resetPassword({ token: rawToken, newPassword: "NewPassword1!" })
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("token já usado lança InvalidTokenError", async () => {
    const user     = await createTestUser("used@sec.com", { emailVerified: true });
    const rawToken = "used-token-1234567890123456789012";
    await createTestPasswordResetToken(user.id, rawToken, {
      usedAt: new Date(), // já marcado como usado
    });

    await expect(
      resetPassword({ token: rawToken, newPassword: "NewPassword1!" })
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });
});

// ---------------------------------------------------------------------------
// 6. Sessão de usuário deletado — revokedAt definido no soft-delete
// ---------------------------------------------------------------------------

describe("Sessão de usuário deletado", () => {
  it("após deleteAccount, todas as session metas têm revokedAt definido", async () => {
    const { createTestSessionMeta } = await import("@tests/helpers/db");

    const user = await createTestUser("sessec@sec.com", { emailVerified: true });
    // Simular duas sessões ativas
    await createTestSessionMeta(user.id, "sess-sec-1");
    await createTestSessionMeta(user.id, "sess-sec-2");

    await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: "DELETE",
      password: "password123",
    });

    const metas = await testPrisma.$queryRaw<Array<{ revokedAt: Date | null }>>`
      SELECT "revokedAt" FROM "UserSessionMeta" WHERE "userId" = ${user.id}
    `;
    expect(metas).toHaveLength(2);
    expect(metas.every((m) => m.revokedAt !== null)).toBe(true);
  });

  it("após deleteAccount, user.deletedAt é definido (bloqueia login)", async () => {
    const user = await createTestUser("logblk@sec.com", { emailVerified: true });

    await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: user.email,
      password: "password123",
    });

    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: { deletedAt: true },
    });
    // deletedAt definido → authorize() retorna null → login bloqueado
    expect(dbUser?.deletedAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. Tokens de reset invalidados ao solicitar novo reset
// ---------------------------------------------------------------------------

describe("Tokens invalidados ao solicitar novo reset", () => {
  it("token anterior é marcado como usado ao gerar novo reset", async () => {
    const user = await createTestUser("inval@sec.com", { emailVerified: true });

    // Primeira solicitação
    await forgotPassword(user.email);
    const first = await testPrisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(first).not.toBeNull();
    expect(first!.usedAt).toBeNull(); // ainda não foi usado diretamente

    // Segunda solicitação invalida o anterior
    await forgotPassword(user.email);
    const firstRefetched = await testPrisma.passwordResetToken.findUnique({
      where: { id: first!.id },
    });

    // O primeiro deve ter sido invalidado (usedAt definido)
    expect(firstRefetched?.usedAt).not.toBeNull();

    // Deve existir um segundo token válido
    const tokens = await testPrisma.$queryRaw<Array<{ id: string; usedAt: Date | null }>>`
      SELECT id, "usedAt" FROM "PasswordResetToken"
      WHERE "userId" = ${user.id}
      ORDER BY "createdAt" ASC
    `;
    expect(tokens).toHaveLength(2);
    expect(tokens[0]!.usedAt).not.toBeNull();  // primeiro: invalidado
    expect(tokens[1]!.usedAt).toBeNull();       // segundo: válido
  });
});

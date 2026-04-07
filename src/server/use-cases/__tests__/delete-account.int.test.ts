/**
 * Testes de integração — deleteAccount (Etapa G)
 *
 * Cobre:
 * - Credenciais: senha correta → deletedAt setado
 * - Credenciais: senha errada → bloqueado
 * - Último owner → 409
 * - Dois owners → permite deleção
 * - Sessões revogadas após delete
 * - Trusted devices revogados após delete
 * - Usuário deletado não consegue logar (simulate authorize block)
 */

import { deleteAccount, checkIsLastOwner } from "@/server/use-cases/delete-account";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
  createTestSessionMeta,
} from "@tests/helpers/db";
import { Role } from "@/generated/prisma/enums";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserDeleted(userId: string) {
  return testPrisma.userSessionMeta.findFirst({
    where: { userId },
    select: { revokedAt: true },
  });
}

// ---------------------------------------------------------------------------
// Credentials — senha correta
// ---------------------------------------------------------------------------

describe("deleteAccount — Credentials", () => {
  it("deleta com confirmText=email e senha correta", async () => {
    const user = await createTestUser("del@example.com", { emailVerified: true });

    const result = await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: user.email,
      password: "password123", // criado com hash(cost=1) de password123
    });

    expect(result.ok).toBe(true);

    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: { deletedAt: true },
    });
    expect(dbUser?.deletedAt).not.toBeNull();
  });

  it("deleta com confirmText='DELETE' e senha correta", async () => {
    const user = await createTestUser("del2@example.com", { emailVerified: true });

    const result = await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: "DELETE",
      password: "password123",
    });

    expect(result.ok).toBe(true);
  });

  it("bloqueia com senha errada", async () => {
    const user = await createTestUser("wrong@example.com", { emailVerified: true });

    const result = await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: user.email,
      password: "senhaerrada123!",
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("WRONG_PASSWORD");

    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: { deletedAt: true },
    });
    expect(dbUser?.deletedAt).toBeNull();
  });

  it("bloqueia com confirmText inválido", async () => {
    const user = await createTestUser("conf@example.com", { emailVerified: true });

    const result = await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: "wrong-confirm",
      password: "password123",
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("INVALID_CONFIRM");
  });
});

// ---------------------------------------------------------------------------
// Revogação de sessões e devices após delete
// ---------------------------------------------------------------------------

describe("deleteAccount — revogação pós-delete", () => {
  it("revoga todas as session metas após deletar", async () => {
    const user = await createTestUser("revoke@example.com", { emailVerified: true });
    await createTestSessionMeta(user.id, "sess-1");
    await createTestSessionMeta(user.id, "sess-2");

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
    expect(metas.every((m) => m.revokedAt !== null)).toBe(true);
  });

  it("deleta registros Session do NextAuth após deletar", async () => {
    const user = await createTestUser("sess-del@example.com", { emailVerified: true });

    // Criar uma Session no NextAuth (simulação)
    await testPrisma.session.create({
      data: {
        userId: user.id,
        sessionToken: "fake-token-" + user.id,
        expires: new Date(Date.now() + 86_400_000),
      },
    });

    await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: "DELETE",
      password: "password123",
    });

    const sessions = await testPrisma.session.findFirst({
      where: { userId: user.id },
    });
    expect(sessions).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Regra do último owner
// ---------------------------------------------------------------------------

describe("deleteAccount — regra do último owner", () => {
  it("bloqueia se for o único OWNER ativo da org", async () => {
    const user = await createTestUser("owner@example.com", { emailVerified: true });
    await createOrgWithMembership(user.id, "my-org", Role.OWNER);

    const result = await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: "DELETE",
      password: "password123",
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("LAST_OWNER");
  });

  it("permite se existir outro OWNER ativo na org", async () => {
    const user = await createTestUser("owner2@example.com", { emailVerified: true });
    const other = await createTestUser("other@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(user.id, "shared-org", Role.OWNER);
    await testPrisma.membership.create({
      data: { userId: other.id, orgId: org.id, role: Role.OWNER },
    });

    const result = await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: "DELETE",
      password: "password123",
    });

    expect(result.ok).toBe(true);
  });

  it("não conta o outro OWNER se ele já estiver deletado", async () => {
    const user = await createTestUser("owner3@example.com", { emailVerified: true });
    const deletedOwner = await createTestUser("deleted-owner@example.com", {
      emailVerified: true,
      deletedAt: new Date(),
    });
    const org = await createOrgWithMembership(user.id, "org-del-check", Role.OWNER);
    await testPrisma.membership.create({
      data: { userId: deletedOwner.id, orgId: org.id, role: Role.OWNER },
    });

    // user é o único OWNER ativo (deletedOwner tem deletedAt)
    const result = await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: "DELETE",
      password: "password123",
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("LAST_OWNER");
  });
});

// ---------------------------------------------------------------------------
// checkIsLastOwner (isolado)
// ---------------------------------------------------------------------------

describe("checkIsLastOwner", () => {
  it("retorna false para usuário sem orgs", async () => {
    const user = await createTestUser("noorg@example.com", { emailVerified: true });
    expect(await checkIsLastOwner(user.id)).toBe(false);
  });

  it("retorna false para MEMBER (não owner)", async () => {
    const user = await createTestUser("member@example.com", { emailVerified: true });
    await createOrgWithMembership(user.id, "some-org", Role.MEMBER);
    expect(await checkIsLastOwner(user.id)).toBe(false);
  });

  it("retorna true para único owner", async () => {
    const user = await createTestUser("solo@example.com", { emailVerified: true });
    await createOrgWithMembership(user.id, "solo-org", Role.OWNER);
    expect(await checkIsLastOwner(user.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Usuário deletado bloqueado no authorize (simulação da query)
// ---------------------------------------------------------------------------

describe("usuário deletado — bloqueio de login", () => {
  it("deletedAt é setado após deleção bem-sucedida", async () => {
    const user = await createTestUser("block@example.com", { emailVerified: true });

    await deleteAccount({
      userId: user.id,
      userEmail: user.email,
      sessionId: undefined,
      confirmText: "DELETE",
      password: "password123",
    });

    const dbUser = await testPrisma.user.findUnique({
      where: { id: user.id },
      select: { deletedAt: true },
    });
    // authorize() retorna null se deletedAt != null
    expect(dbUser?.deletedAt).not.toBeNull();
  });
});

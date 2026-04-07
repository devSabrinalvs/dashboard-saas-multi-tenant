/**
 * Testes de integração — UserSessionMeta (Etapa F)
 *
 * Cobre: criar, listar, revogar, revogar-outras e segurança (IDOR).
 * Usa banco de testes separado (saas_multitenant_test).
 */

import {
  createSessionMeta,
  findSessionMeta,
  listActiveSessions,
  revokeSession,
  revokeOtherSessions,
  pingSessionMeta,
} from "@/server/repo/session-meta-repo";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createTestSessionMeta,
} from "@tests/helpers/db";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ---------------------------------------------------------------------------
// createSessionMeta + findSessionMeta
// ---------------------------------------------------------------------------

describe("createSessionMeta / findSessionMeta", () => {
  it("cria metadata e recupera pelo sessionId", async () => {
    const user = await createTestUser("sess1@example.com", { emailVerified: true });
    const sessionId = "sess-abc-123";

    await createSessionMeta({
      userId: user.id,
      sessionId,
      ip: "1.2.3.4",
      userAgent: "Mozilla/5.0 Chrome/120",
      deviceLabel: "Chrome em Windows",
    });

    const meta = await findSessionMeta(sessionId);
    expect(meta).not.toBeNull();
    expect(meta?.revokedAt).toBeNull();
  });

  it("retorna null para sessionId inexistente", async () => {
    const meta = await findSessionMeta("non-existent-id");
    expect(meta).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listActiveSessions
// ---------------------------------------------------------------------------

describe("listActiveSessions", () => {
  it("retorna sessões ativas ordenadas por lastSeenAt DESC", async () => {
    const user = await createTestUser("list@example.com", { emailVerified: true });
    const now = new Date();

    // Sessão mais antiga
    await createTestSessionMeta(user.id, "sess-old", {
      deviceLabel: "Firefox em Linux",
      lastSeenAt: new Date(now.getTime() - 60 * 60 * 1000), // -1h
    });
    // Sessão mais recente
    await createTestSessionMeta(user.id, "sess-new", {
      deviceLabel: "Chrome em Windows",
      lastSeenAt: new Date(now.getTime() - 5 * 60 * 1000), // -5min
    });

    const rows = await listActiveSessions(user.id);

    expect(rows).toHaveLength(2);
    // Mais recente primeiro
    expect(rows[0]?.sessionId).toBe("sess-new");
    expect(rows[1]?.sessionId).toBe("sess-old");
  });

  it("não retorna sessões revogadas", async () => {
    const user = await createTestUser("norev@example.com", { emailVerified: true });

    await createTestSessionMeta(user.id, "sess-active");
    await createTestSessionMeta(user.id, "sess-revoked", {
      revokedAt: new Date(),
    });

    const rows = await listActiveSessions(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sessionId).toBe("sess-active");
  });

  it("não retorna sessões inativas há mais de 30 dias", async () => {
    const user = await createTestUser("old@example.com", { emailVerified: true });
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

    await createTestSessionMeta(user.id, "sess-stale", {
      lastSeenAt: thirtyOneDaysAgo,
    });
    await createTestSessionMeta(user.id, "sess-recent");

    const rows = await listActiveSessions(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sessionId).toBe("sess-recent");
  });

  it("retorna lista vazia para usuário sem sessões", async () => {
    const user = await createTestUser("empty@example.com", { emailVerified: true });
    const rows = await listActiveSessions(user.id);
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// revokeSession
// ---------------------------------------------------------------------------

describe("revokeSession", () => {
  it("revoga a sessão e marca revokedAt", async () => {
    const user = await createTestUser("revoke@example.com", { emailVerified: true });
    await createTestSessionMeta(user.id, "to-revoke");

    const result = await revokeSession("to-revoke", user.id);
    expect(result).toBe(true);

    const meta = await findSessionMeta("to-revoke");
    expect(meta?.revokedAt).not.toBeNull();
  });

  it("retorna false para sessionId de outro usuário (IDOR)", async () => {
    const userA = await createTestUser("a@example.com", { emailVerified: true });
    const userB = await createTestUser("b@example.com", { emailVerified: true });
    await createTestSessionMeta(userA.id, "sess-a");

    const result = await revokeSession("sess-a", userB.id);
    expect(result).toBe(false);

    // Sessão do userA não foi revogada
    const meta = await findSessionMeta("sess-a");
    expect(meta?.revokedAt).toBeNull();
  });

  it("retorna false para sessionId inexistente", async () => {
    const user = await createTestUser("ghost@example.com", { emailVerified: true });
    const result = await revokeSession("does-not-exist", user.id);
    expect(result).toBe(false);
  });

  it("retorna true sem erro se já revogada (idempotente)", async () => {
    const user = await createTestUser("idem@example.com", { emailVerified: true });
    await createTestSessionMeta(user.id, "already-revoked", { revokedAt: new Date() });

    const result = await revokeSession("already-revoked", user.id);
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// revokeOtherSessions
// ---------------------------------------------------------------------------

describe("revokeOtherSessions", () => {
  it("revoga todas exceto a atual", async () => {
    const user = await createTestUser("others@example.com", { emailVerified: true });

    await createTestSessionMeta(user.id, "current");
    await createTestSessionMeta(user.id, "other-1");
    await createTestSessionMeta(user.id, "other-2");

    await revokeOtherSessions(user.id, "current");

    const rows = await listActiveSessions(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sessionId).toBe("current");
  });

  it("não revoga sessões de outros usuários", async () => {
    const userA = await createTestUser("ra@example.com", { emailVerified: true });
    const userB = await createTestUser("rb@example.com", { emailVerified: true });

    await createTestSessionMeta(userA.id, "sess-a-1");
    await createTestSessionMeta(userA.id, "sess-a-current");
    await createTestSessionMeta(userB.id, "sess-b-1");

    await revokeOtherSessions(userA.id, "sess-a-current");

    // userB ainda tem sessão ativa
    const rowsB = await listActiveSessions(userB.id);
    expect(rowsB).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// pingSessionMeta
// ---------------------------------------------------------------------------

describe("pingSessionMeta", () => {
  it("atualiza lastSeenAt quando passou o throttle", async () => {
    const user = await createTestUser("ping@example.com", { emailVerified: true });
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);
    await createTestSessionMeta(user.id, "ping-sess", { lastSeenAt: elevenMinutesAgo });

    await pingSessionMeta("ping-sess", user.id);

    const rows = await listActiveSessions(user.id);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row!.lastSeenAt.getTime()).toBeGreaterThan(elevenMinutesAgo.getTime());
  });

  it("não atualiza antes do throttle (< 10 min)", async () => {
    const user = await createTestUser("noping@example.com", { emailVerified: true });
    const recentTime = new Date(Date.now() - 2 * 60 * 1000); // -2 min
    await createTestSessionMeta(user.id, "noping-sess", { lastSeenAt: recentTime });

    await pingSessionMeta("noping-sess", user.id);

    const rows = await listActiveSessions(user.id);
    const row = rows[0];
    // lastSeenAt não deve ter mudado significativamente
    expect(Math.abs(row!.lastSeenAt.getTime() - recentTime.getTime())).toBeLessThan(1000);
  });

  it("ignora ping para sessão de outro usuário", async () => {
    const userA = await createTestUser("pinga@example.com", { emailVerified: true });
    const userB = await createTestUser("pingb@example.com", { emailVerified: true });
    const oldTime = new Date(Date.now() - 60 * 60 * 1000);
    await createTestSessionMeta(userA.id, "sessA", { lastSeenAt: oldTime });

    // userB tenta pingar sessão de userA → ignorado
    await pingSessionMeta("sessA", userB.id);

    const rows = await listActiveSessions(userA.id);
    expect(Math.abs(rows[0]!.lastSeenAt.getTime() - oldTime.getTime())).toBeLessThan(1000);
  });
});

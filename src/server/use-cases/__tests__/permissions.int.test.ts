/**
 * Testes de integração — Permissões (RBAC) + Audit + Rate Limit
 *
 * Garante que:
 * - VIEWER é bloqueado em mutações (PermissionDeniedError)
 * - MEMBER tem acesso ao core de projetos/tasks
 * - Mutações geram AuditLog (efeito colateral)
 * - Rate limit bloqueia após exceder limite (integração com prismaStore)
 *
 * Executar com: pnpm test:int
 */
import { createProject } from "@/server/use-cases/create-project";
import { updateProject } from "@/server/use-cases/update-project";
import { deleteProject } from "@/server/use-cases/delete-project";
import { createTask } from "@/server/use-cases/create-task";
import { PermissionDeniedError } from "@/security/assert-permission";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { inviteKey } from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { Role } from "@/generated/prisma/enums";
import type { OrgContext } from "@/server/org/require-org-context";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
  createTestProject,
} from "@tests/helpers/db";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

function makeCtx(
  userId: string,
  email: string,
  org: { id: string; slug: string; name: string },
  role: Role
): OrgContext {
  return { userId, email, orgId: org.id, orgSlug: org.slug, orgName: org.name, role };
}

// ─── VIEWER bloqueado ────────────────────────────────────────────────────────

describe("VIEWER — bloqueado em mutações", () => {
  it("createProject lança PermissionDeniedError para VIEWER", async () => {
    const user = await createTestUser("viewer@test.com");
    const org = await createOrgWithMembership(user.id, "org-v1", Role.VIEWER);
    const ctx = makeCtx(user.id, user.email, org, Role.VIEWER);

    await expect(createProject(ctx, { name: "Proj" })).rejects.toBeInstanceOf(
      PermissionDeniedError
    );
  });

  it("updateProject lança PermissionDeniedError para VIEWER", async () => {
    const owner = await createTestUser("owner-v@test.com");
    const orgOwner = await createOrgWithMembership(owner.id, "org-v2");
    const project = await createTestProject(orgOwner.id);

    const viewer = await createTestUser("viewer2@test.com");
    await testPrisma.membership.create({
      data: { userId: viewer.id, orgId: orgOwner.id, role: Role.VIEWER },
    });
    const ctxViewer = makeCtx(viewer.id, viewer.email, orgOwner, Role.VIEWER);

    await expect(
      updateProject(ctxViewer, project.id, { name: "Novo Nome" })
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("deleteProject lança PermissionDeniedError para VIEWER", async () => {
    const owner = await createTestUser("owner-v2@test.com");
    const org = await createOrgWithMembership(owner.id, "org-v3");
    const project = await createTestProject(org.id);

    const viewer = await createTestUser("viewer3@test.com");
    await testPrisma.membership.create({
      data: { userId: viewer.id, orgId: org.id, role: Role.VIEWER },
    });
    const ctxViewer = makeCtx(viewer.id, viewer.email, org, Role.VIEWER);

    await expect(deleteProject(ctxViewer, project.id)).rejects.toBeInstanceOf(
      PermissionDeniedError
    );
  });
});

// ─── MEMBER permitido ────────────────────────────────────────────────────────

describe("MEMBER — permitido no core", () => {
  it("createProject funciona para MEMBER", async () => {
    const user = await createTestUser("member@test.com");
    const org = await createOrgWithMembership(user.id, "org-m1", Role.MEMBER);
    const ctx = makeCtx(user.id, user.email, org, Role.MEMBER);

    const project = await createProject(ctx, { name: "Proj do Member" });

    expect(project.id).toBeDefined();
    expect(project.orgId).toBe(org.id);
  });

  it("createTask funciona para MEMBER", async () => {
    const user = await createTestUser("member2@test.com");
    const org = await createOrgWithMembership(user.id, "org-m2", Role.MEMBER);
    const ctx = makeCtx(user.id, user.email, org, Role.MEMBER);

    const project = await createTestProject(org.id);
    const task = await createTask(ctx, project.id, { title: "Task do Member" });

    expect(task.id).toBeDefined();
    expect(task.orgId).toBe(org.id);
  });
});

// ─── Audit como efeito colateral ─────────────────────────────────────────────

describe("Audit Log — efeito colateral de mutações", () => {
  it("createProject gera AuditLog para MEMBER", async () => {
    const user = await createTestUser("member-audit@test.com");
    const org = await createOrgWithMembership(user.id, "org-audit-m", Role.MEMBER);
    const ctx = makeCtx(user.id, user.email, org, Role.MEMBER);

    const project = await createProject(ctx, { name: "Auditado" });

    // logAudit é fire-and-forget: pequeno delay
    await new Promise((r) => setTimeout(r, 50));

    const logs = await testPrisma.auditLog.findMany({
      where: { orgId: org.id, action: "project.created" },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].actorUserId).toBe(user.id);
    const meta = logs[0].metadata as Record<string, unknown>;
    expect(meta.projectId).toBe(project.id);
  });
});

// ─── Rate Limit — integração com prismaStore ─────────────────────────────────

describe("Rate Limit — invite key com prismaStore (integração DB)", () => {
  beforeEach(async () => {
    // Limpar buckets antes de cada cenário
    await testPrisma.$executeRaw`DELETE FROM "RateLimitBucket"`;
  });

  it("retorna ok=true nas primeiras N requisições e ok=false após exceder limite", async () => {
    const { prismaStore } = await import(
      "@/security/rate-limit/stores/prisma-store"
    );

    const key = inviteKey("org-rl-test", "user-rl-test");
    const { limit, windowMs } = RATE_LIMITS.INVITE;

    // Simula exatamente `limit` chamadas (deve ser ok)
    for (let i = 0; i < limit; i++) {
      const result = await rateLimit(key, { limit, windowMs }, prismaStore);
      expect(result.ok).toBe(true);
    }

    // A chamada seguinte excede o limite
    const over = await rateLimit(key, { limit, windowMs }, prismaStore);
    expect(over.ok).toBe(false);
    expect(over.remaining).toBe(0);
    expect(over.resetAt).toBeInstanceOf(Date);
  });

  it("buckets de chaves diferentes são independentes", async () => {
    const { prismaStore } = await import(
      "@/security/rate-limit/stores/prisma-store"
    );

    const keyA = inviteKey("org-rl-a", "user-rl-a");
    const keyB = inviteKey("org-rl-b", "user-rl-b");
    const opts = RATE_LIMITS.INVITE;

    const r1 = await rateLimit(keyA, opts, prismaStore);
    const r2 = await rateLimit(keyB, opts, prismaStore);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);

    // Cada chave tem seu próprio remaining = limit - 1
    expect(r1.remaining).toBe(opts.limit - 1);
    expect(r2.remaining).toBe(opts.limit - 1);
  });
});

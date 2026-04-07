/**
 * Testes de integração: enforcement de limites de plano nos use-cases.
 *
 * Cobre:
 *  - createInvite: lança PlanLimitReachedError quando assentos esgotados
 *  - createProject: lança PlanLimitReachedError quando projetos esgotados
 *  - createTask: lança PlanLimitReachedError quando tasks por projeto esgotadas
 *
 * Usa DB de teste real — não mocka módulos (ESM int test).
 */

import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
  createTestProject,
  createTestInvite,
} from "@tests/helpers/db";
import { createInvite } from "../create-invite";
import { createProject } from "../create-project";
import { createTask } from "../create-task";
import { PlanLimitReachedError } from "@/billing/plan-limits";
import type { OrgContext } from "@/server/org/require-org-context";
import { Role } from "@/generated/prisma/enums";
import { randomUUID } from "crypto";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOrgContext(
  overrides: Partial<OrgContext> & Pick<OrgContext, "userId" | "orgId" | "orgSlug">
): OrgContext {
  return {
    email: "owner@example.com",
    orgName: "Test Org",
    role: Role.OWNER,
    plan: "FREE",
    ...overrides,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ─── createInvite: limite de membros ─────────────────────────────────────────

describe("createInvite — limite de membros (FREE = 3)", () => {
  it("lança PlanLimitReachedError quando assentos esgotados (3 = 1 member + 2 pending invites)", async () => {
    const owner = await createTestUser("owner@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "test-org", Role.OWNER);

    // Já temos 1 membro (owner). Criar 2 convites pendentes → total = 3 = maxMembers
    await createTestInvite(org.id, "invite1@example.com");
    await createTestInvite(org.id, "invite2@example.com");

    const ctx = makeOrgContext({ userId: owner.id, orgId: org.id, orgSlug: org.slug });

    // 4º assento (member + 2 invites + 1 novo) ultrapassa o limite
    await expect(createInvite(ctx, "invite3@example.com")).rejects.toBeInstanceOf(
      PlanLimitReachedError
    );
  });

  it("retorna PlanLimitReachedError com details corretos", async () => {
    const owner = await createTestUser("owner2@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "test-org-2", Role.OWNER);

    // 1 membro + 2 convites = 3 assentos (FREE limit)
    await createTestInvite(org.id, "a@example.com");
    await createTestInvite(org.id, "b@example.com");

    const ctx = makeOrgContext({ userId: owner.id, orgId: org.id, orgSlug: org.slug });

    let caughtErr: PlanLimitReachedError | null = null;
    try {
      await createInvite(ctx, "c@example.com");
    } catch (err) {
      if (err instanceof PlanLimitReachedError) caughtErr = err;
    }

    expect(caughtErr).not.toBeNull();
    expect(caughtErr!.details.resource).toBe("members");
    expect(caughtErr!.details.limit).toBe(3);
    expect(caughtErr!.details.current).toBe(3);
    expect(caughtErr!.details.plan).toBe("FREE");
    expect(caughtErr!.status).toBe(409);
    expect(caughtErr!.code).toBe("PLAN_LIMIT_REACHED");
  });

  it("permite criar convite quando ainda há assentos disponíveis", async () => {
    const owner = await createTestUser("owner3@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "test-org-3", Role.OWNER);

    // Apenas 1 membro, 2 assentos livres
    const ctx = makeOrgContext({ userId: owner.id, orgId: org.id, orgSlug: org.slug });

    const result = await createInvite(ctx, "new@example.com");
    expect(result.inviteId).toBeDefined();
  });

  it("PRO permite mais assentos — não lança para 3 convites com 1 membro", async () => {
    const owner = await createTestUser("proowner@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "pro-org", Role.OWNER);

    // Criar 12 convites pendentes (total = 1 + 12 = 13 < 15 maxMembers para PRO)
    for (let i = 0; i < 12; i++) {
      await createTestInvite(org.id, `user${i}@example.com`);
    }

    const ctx = makeOrgContext({
      userId: owner.id,
      orgId: org.id,
      orgSlug: org.slug,
      plan: "PRO",
    });

    // 14 assentos usados, limite PRO é 15 → ok
    const result = await createInvite(ctx, "the13th@example.com");
    expect(result.inviteId).toBeDefined();
  });
});

// ─── createProject: limite de projetos ───────────────────────────────────────

describe("createProject — limite de projetos (FREE = 5)", () => {
  it("lança PlanLimitReachedError quando projetos esgotados", async () => {
    const owner = await createTestUser("projowner@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "proj-org", Role.OWNER);

    // Criar 5 projetos diretamente no DB
    for (let i = 0; i < 5; i++) {
      await createTestProject(org.id, { name: `Projeto ${i}` });
    }

    const ctx = makeOrgContext({ userId: owner.id, orgId: org.id, orgSlug: org.slug });

    await expect(
      createProject(ctx, { name: "Projeto 6" })
    ).rejects.toBeInstanceOf(PlanLimitReachedError);
  });

  it("retorna details corretos no erro de projeto", async () => {
    const owner = await createTestUser("projowner2@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "proj-org-2", Role.OWNER);

    for (let i = 0; i < 5; i++) {
      await createTestProject(org.id, { name: `P${i}` });
    }

    const ctx = makeOrgContext({ userId: owner.id, orgId: org.id, orgSlug: org.slug });

    let err: PlanLimitReachedError | null = null;
    try {
      await createProject(ctx, { name: "P5" });
    } catch (e) {
      if (e instanceof PlanLimitReachedError) err = e;
    }

    expect(err!.details.resource).toBe("projects");
    expect(err!.details.limit).toBe(5);
    expect(err!.details.current).toBe(5);
  });

  it("permite criar projeto quando ainda há slots disponíveis", async () => {
    const owner = await createTestUser("projowner3@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "proj-org-3", Role.OWNER);

    const ctx = makeOrgContext({ userId: owner.id, orgId: org.id, orgSlug: org.slug });

    const project = await createProject(ctx, { name: "Novo Projeto" });
    expect(project.id).toBeDefined();
  });
});

// ─── createTask: limite de tasks por projeto ──────────────────────────────────

describe("createTask — limite de tasks por projeto (FREE = 200)", () => {
  it("lança PlanLimitReachedError quando tasks por projeto esgotadas", async () => {
    const owner = await createTestUser("taskowner@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "task-org", Role.OWNER);
    const project = await createTestProject(org.id, { name: "Projeto com limite" });

    // Inserção em massa via SQL para criar 200 tasks rapidamente
    await testPrisma.$executeRaw`
      INSERT INTO "Task" (id, "orgId", "projectId", title, status, tags, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid()::text,
        ${org.id},
        ${project.id},
        'Task ' || g,
        'TODO',
        '{}',
        NOW(),
        NOW()
      FROM generate_series(1, 200) g
    `;

    const ctx = makeOrgContext({ userId: owner.id, orgId: org.id, orgSlug: org.slug });

    await expect(
      createTask(ctx, project.id, { title: "Task 201" })
    ).rejects.toBeInstanceOf(PlanLimitReachedError);
  });

  it("retorna details corretos no erro de task", async () => {
    const owner = await createTestUser("taskowner2@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "task-org-2", Role.OWNER);
    const project = await createTestProject(org.id, { name: "Proj" });

    await testPrisma.$executeRaw`
      INSERT INTO "Task" (id, "orgId", "projectId", title, status, tags, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid()::text,
        ${org.id},
        ${project.id},
        'T ' || g,
        'TODO',
        '{}',
        NOW(),
        NOW()
      FROM generate_series(1, 200) g
    `;

    const ctx = makeOrgContext({ userId: owner.id, orgId: org.id, orgSlug: org.slug });

    let err: PlanLimitReachedError | null = null;
    try {
      await createTask(ctx, project.id, { title: "Extra" });
    } catch (e) {
      if (e instanceof PlanLimitReachedError) err = e;
    }

    expect(err!.details.resource).toBe("tasks_per_project");
    expect(err!.details.limit).toBe(200);
    expect(err!.details.current).toBe(200);
  });

  it("limites são por projeto — outro projeto não é afetado", async () => {
    const owner = await createTestUser("taskowner3@example.com", { emailVerified: true });
    const org = await createOrgWithMembership(owner.id, "task-org-3", Role.OWNER);
    const project1 = await createTestProject(org.id, { name: "Proj 1" });
    const project2 = await createTestProject(org.id, { name: "Proj 2" });

    // Enche o projeto1 com 200 tasks
    await testPrisma.$executeRaw`
      INSERT INTO "Task" (id, "orgId", "projectId", title, status, tags, "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text, ${org.id}, ${project1.id}, 'T ' || g, 'TODO', '{}', NOW(), NOW()
      FROM generate_series(1, 200) g
    `;

    const ctx = makeOrgContext({ userId: owner.id, orgId: org.id, orgSlug: org.slug });

    // Projeto2 ainda tem 0 tasks — deve criar sem erro
    const task = await createTask(ctx, project2.id, { title: "Task em proj2" });
    expect(task.id).toBeDefined();
  });
});

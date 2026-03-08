/**
 * Testes de integração — Isolamento Multi-tenant
 *
 * Garante que use-cases bloqueiam acesso cross-tenant para
 * projetos, tasks e membros.
 *
 * Executar com: pnpm test:int
 */
import { getProject } from "@/server/use-cases/get-project";
import { deleteProject } from "@/server/use-cases/delete-project";
import { listProjects } from "@/server/use-cases/list-projects";
import { listTasksByProject } from "@/server/use-cases/list-tasks";
import { createTask } from "@/server/use-cases/create-task";
import { listAuditLogs } from "@/server/use-cases/list-audit-logs";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
import { Role } from "@/generated/prisma/enums";
import type { OrgContext } from "@/server/org/require-org-context";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
  createTestProject,
  createTestTask,
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
  role: Role = Role.OWNER
): OrgContext {
  return { userId, email, orgId: org.id, orgSlug: org.slug, orgName: org.name, role };
}

describe("Isolamento multi-tenant — Projetos", () => {
  it("getProject lança ProjectNotFoundError ao acessar projeto de outra org", async () => {
    const user = await createTestUser("owner@test.com");
    const orgA = await createOrgWithMembership(user.id, "org-a");
    const orgB = await createOrgWithMembership(user.id, "org-b");

    const projectA = await createTestProject(orgA.id, { name: "Proj de A" });
    const ctxB = makeCtx(user.id, user.email, orgB);

    // Ctx de B tentando ler projeto de A
    await expect(getProject(ctxB, projectA.id)).rejects.toBeInstanceOf(
      ProjectNotFoundError
    );
  });

  it("deleteProject lança ProjectNotFoundError ao deletar projeto de outra org", async () => {
    const user = await createTestUser("owner2@test.com");
    const orgA = await createOrgWithMembership(user.id, "org-a2");
    const orgB = await createOrgWithMembership(user.id, "org-b2");

    const projectA = await createTestProject(orgA.id, { name: "Proj A" });
    const ctxB = makeCtx(user.id, user.email, orgB);

    await expect(deleteProject(ctxB, projectA.id)).rejects.toBeInstanceOf(
      ProjectNotFoundError
    );

    // Projeto de A deve ainda existir
    const still = await testPrisma.project.findUnique({ where: { id: projectA.id } });
    expect(still).not.toBeNull();
  });

  it("listProjects retorna apenas projetos da própria org", async () => {
    const user = await createTestUser("owner3@test.com");
    const orgA = await createOrgWithMembership(user.id, "org-a3");
    const orgB = await createOrgWithMembership(user.id, "org-b3");

    await createTestProject(orgA.id, { name: "Proj de A" });
    await createTestProject(orgA.id, { name: "Proj de A 2" });
    await createTestProject(orgB.id, { name: "Proj de B" });

    const ctxA = makeCtx(user.id, user.email, orgA);
    const result = await listProjects(ctxA, { page: 1, pageSize: 10 });

    expect(result.total).toBe(2);
    expect(result.items.every((p) => p.orgId === orgA.id)).toBe(true);
  });
});

describe("Isolamento multi-tenant — Tasks", () => {
  it("listTasksByProject lança ProjectNotFoundError ao listar tasks de projeto de outra org", async () => {
    const user = await createTestUser("owner4@test.com");
    const orgA = await createOrgWithMembership(user.id, "org-a4");
    const orgB = await createOrgWithMembership(user.id, "org-b4");

    const projectA = await createTestProject(orgA.id, { name: "Proj A" });
    await createTestTask(orgA.id, projectA.id, { title: "Task A" });

    const ctxB = makeCtx(user.id, user.email, orgB);

    await expect(
      listTasksByProject(ctxB, projectA.id, { page: 1, pageSize: 10 })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("createTask lança ProjectNotFoundError ao criar task em projeto de outra org", async () => {
    const user = await createTestUser("owner5@test.com");
    const orgA = await createOrgWithMembership(user.id, "org-a5");
    const orgB = await createOrgWithMembership(user.id, "org-b5");

    const projectA = await createTestProject(orgA.id, { name: "Proj A" });
    const ctxB = makeCtx(user.id, user.email, orgB);

    await expect(
      createTask(ctxB, projectA.id, { title: "Task Indevida" })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);

    // Nenhuma task deve ter sido criada
    const tasks = await testPrisma.task.findMany({ where: { projectId: projectA.id } });
    expect(tasks).toHaveLength(0);
  });
});

describe("Isolamento multi-tenant — Audit Logs", () => {
  it("listAuditLogs não retorna logs de outra org", async () => {
    const user = await createTestUser("owner6@test.com");
    const orgA = await createOrgWithMembership(user.id, "org-a6");
    const orgB = await createOrgWithMembership(user.id, "org-b6");

    // Insere log na org A
    await testPrisma.auditLog.create({
      data: { orgId: orgA.id, actorUserId: user.id, action: "project.created", metadata: {} },
    });

    // Contexto de B não deve ver logs de A
    const ctxB = makeCtx(user.id, user.email, orgB);
    const result = await listAuditLogs(ctxB, { page: 1, pageSize: 10 });

    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

/**
 * Testes de integracao - createTask use-case
 */
import { createTask } from "@/server/use-cases/create-task";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
import { Role, TaskStatus } from "@/generated/prisma/enums";
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
  role: Role = Role.OWNER
): OrgContext {
  return { userId, email, orgId: org.id, orgSlug: org.slug, orgName: org.name, role, plan: "FREE" };
}

describe("createTask()", () => {
  it("cria tarefa com status padrao TODO e tags vazias", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-a");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);

    const task = await createTask(ctx, project.id, { title: "Nova Tarefa" });

    expect(task.id).toBeDefined();
    expect(task.title).toBe("Nova Tarefa");
    expect(task.status).toBe(TaskStatus.TODO);
    expect(task.tags).toHaveLength(0);
    expect(task.projectId).toBe(project.id);
    expect(task.orgId).toBe(org.id);

    const inDb = await testPrisma.task.findUnique({ where: { id: task.id } });
    expect(inDb).not.toBeNull();
  });

  it("cria tarefa com status, descricao e tags", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);

    const task = await createTask(ctx, project.id, {
      title: "Tarefa Completa",
      description: "Descricao da tarefa",
      status: TaskStatus.IN_PROGRESS,
      tags: ["frontend", "urgente"],
    });

    expect(task.description).toBe("Descricao da tarefa");
    expect(task.status).toBe(TaskStatus.IN_PROGRESS);
    expect(task.tags).toEqual(["frontend", "urgente"]);
  });

  it("lanca ProjectNotFoundError se projeto nao pertence a org (cross-tenant)", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-c1");
    const org2 = await createOrgWithMembership(user.id, "org-c2");

    const project = await createTestProject(org1.id);
    const ctx2 = makeCtx(user.id, user.email, org2);

    await expect(
      createTask(ctx2, project.id, { title: "Hack" })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("lanca ProjectNotFoundError para projectId inexistente", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-d");
    const ctx = makeCtx(user.id, user.email, org);

    await expect(
      createTask(ctx, "00000000-0000-0000-0000-000000000000", { title: "X" })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});

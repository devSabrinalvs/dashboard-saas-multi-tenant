/**
 * Testes de integracao - deleteTask use-case
 */
import { deleteTask } from "@/server/use-cases/delete-task";
import { TaskNotFoundError } from "@/server/errors/project-errors";
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
  return { userId, email, orgId: org.id, orgSlug: org.slug, orgName: org.name, role, plan: "FREE" };
}

describe("deleteTask()", () => {
  it("exclui tarefa do banco", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-a");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);
    const task = await createTestTask(org.id, project.id, { title: "Para Deletar" });

    await deleteTask(ctx, task.id);

    const inDb = await testPrisma.task.findUnique({ where: { id: task.id } });
    expect(inDb).toBeNull();
  });

  it("retorna a tarefa deletada", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);
    const task = await createTestTask(org.id, project.id, { title: "Retornada" });

    const deleted = await deleteTask(ctx, task.id);

    expect(deleted.id).toBe(task.id);
    expect(deleted.title).toBe("Retornada");
  });

  it("lanca TaskNotFoundError para tarefa de outra org (cross-tenant)", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-c1");
    const org2 = await createOrgWithMembership(user.id, "org-c2");

    const project = await createTestProject(org1.id);
    const task = await createTestTask(org1.id, project.id);
    const ctx2 = makeCtx(user.id, user.email, org2);

    await expect(
      deleteTask(ctx2, task.id)
    ).rejects.toBeInstanceOf(TaskNotFoundError);

    // Tarefa nao foi deletada
    const inDb = await testPrisma.task.findUnique({ where: { id: task.id } });
    expect(inDb).not.toBeNull();
  });

  it("lanca TaskNotFoundError para id inexistente", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-d");
    const ctx = makeCtx(user.id, user.email, org);

    await expect(
      deleteTask(ctx, "00000000-0000-0000-0000-000000000000")
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});

/**
 * Testes de integracao - updateTask use-case
 */
import { updateTask } from "@/server/use-cases/update-task";
import { TaskNotFoundError } from "@/server/errors/project-errors";
import { Role, TaskStatus } from "@/generated/prisma/enums";
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

describe("updateTask()", () => {
  it("atualiza titulo e status da tarefa", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-a");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);
    const task = await createTestTask(org.id, project.id, {
      title: "Original",
      status: TaskStatus.TODO,
    });

    const updated = await updateTask(ctx, task.id, {
      title: "Atualizado",
      status: TaskStatus.DONE,
    });

    expect(updated.title).toBe("Atualizado");
    expect(updated.status).toBe(TaskStatus.DONE);
  });

  it("atualiza tags da tarefa", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);
    const task = await createTestTask(org.id, project.id, { tags: ["old"] });

    const updated = await updateTask(ctx, task.id, { tags: ["new", "tag"] });

    expect(updated.tags).toEqual(["new", "tag"]);
  });

  it("lanca TaskNotFoundError para tarefa de outra org (cross-tenant)", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-c1");
    const org2 = await createOrgWithMembership(user.id, "org-c2");

    const project = await createTestProject(org1.id);
    const task = await createTestTask(org1.id, project.id);
    const ctx2 = makeCtx(user.id, user.email, org2);

    await expect(
      updateTask(ctx2, task.id, { title: "Hack" })
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("lanca TaskNotFoundError para id inexistente", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-d");
    const ctx = makeCtx(user.id, user.email, org);

    await expect(
      updateTask(ctx, "00000000-0000-0000-0000-000000000000", { title: "X" })
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("TaskNotFoundError.status === 404", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-e");
    const ctx = makeCtx(user.id, user.email, org);

    try {
      await updateTask(ctx, "00000000-0000-0000-0000-000000000000", { title: "X" });
      throw new Error("Deveria ter lancado TaskNotFoundError");
    } catch (err) {
      expect(err).toBeInstanceOf(TaskNotFoundError);
      expect((err as TaskNotFoundError).status).toBe(404);
    }
  });
});

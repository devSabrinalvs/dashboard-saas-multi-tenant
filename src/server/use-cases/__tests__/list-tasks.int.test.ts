/**
 * Testes de integracao - listTasksByProject use-case
 */
import { listTasksByProject } from "@/server/use-cases/list-tasks";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
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
  return { userId, email, orgId: org.id, orgSlug: org.slug, orgName: org.name, role };
}

describe("listTasksByProject()", () => {
  it("retorna lista vazia quando nao ha tarefas", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-a");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);

    const result = await listTasksByProject(ctx, project.id, {
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("retorna tarefas do projeto", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);

    await createTestTask(org.id, project.id, { title: "Tarefa 1" });
    await createTestTask(org.id, project.id, { title: "Tarefa 2" });

    const result = await listTasksByProject(ctx, project.id, {
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("filtra por status", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-c");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);

    await createTestTask(org.id, project.id, { status: TaskStatus.TODO });
    await createTestTask(org.id, project.id, { status: TaskStatus.DONE });
    await createTestTask(org.id, project.id, { status: TaskStatus.DONE });

    const result = await listTasksByProject(ctx, project.id, {
      status: TaskStatus.DONE,
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((t) => t.status === TaskStatus.DONE)).toBe(true);
  });

  it("filtra por tag", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-d");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id);

    await createTestTask(org.id, project.id, { tags: ["frontend", "bug"] });
    await createTestTask(org.id, project.id, { tags: ["backend"] });

    const result = await listTasksByProject(ctx, project.id, {
      tag: "frontend",
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].tags).toContain("frontend");
  });

  it("lanca ProjectNotFoundError se projeto nao pertence a org (cross-tenant)", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-e1");
    const org2 = await createOrgWithMembership(user.id, "org-e2");

    const project = await createTestProject(org1.id);
    const ctx2 = makeCtx(user.id, user.email, org2);

    await expect(
      listTasksByProject(ctx2, project.id, { page: 1, pageSize: 10 })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});

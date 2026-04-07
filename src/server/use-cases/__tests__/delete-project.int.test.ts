/**
 * Testes de integracao - deleteProject use-case
 */
import { deleteProject } from "@/server/use-cases/delete-project";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
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
  role: Role = Role.OWNER
): OrgContext {
  return { userId, email, orgId: org.id, orgSlug: org.slug, orgName: org.name, role, plan: "FREE" };
}

describe("deleteProject()", () => {
  it("exclui projeto do banco", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-a");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id, { name: "Para Deletar" });

    await deleteProject(ctx, project.id);

    const inDb = await testPrisma.project.findUnique({ where: { id: project.id } });
    expect(inDb).toBeNull();
  });

  it("retorna o projeto deletado", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id, { name: "Retornado" });

    const deleted = await deleteProject(ctx, project.id);

    expect(deleted.id).toBe(project.id);
    expect(deleted.name).toBe("Retornado");
  });

  it("lanca ProjectNotFoundError para projeto de outra org (cross-tenant)", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-c1");
    const org2 = await createOrgWithMembership(user.id, "org-c2");

    const project = await createTestProject(org1.id, { name: "Projeto Org1" });
    const ctx2 = makeCtx(user.id, user.email, org2);

    await expect(
      deleteProject(ctx2, project.id)
    ).rejects.toBeInstanceOf(ProjectNotFoundError);

    // Projeto nao foi deletado
    const inDb = await testPrisma.project.findUnique({ where: { id: project.id } });
    expect(inDb).not.toBeNull();
  });

  it("lanca ProjectNotFoundError para id inexistente", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-d");
    const ctx = makeCtx(user.id, user.email, org);

    await expect(
      deleteProject(ctx, "00000000-0000-0000-0000-000000000000")
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});

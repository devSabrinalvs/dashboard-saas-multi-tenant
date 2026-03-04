/**
 * Testes de integracao - updateProject use-case
 */
import { updateProject } from "@/server/use-cases/update-project";
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
  return { userId, email, orgId: org.id, orgSlug: org.slug, orgName: org.name, role };
}

describe("updateProject()", () => {
  it("atualiza nome do projeto corretamente", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-a");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id, { name: "Antigo Nome" });

    const updated = await updateProject(ctx, project.id, { name: "Novo Nome" });

    expect(updated.name).toBe("Novo Nome");
    expect(updated.id).toBe(project.id);
  });

  it("atualiza descricao para null (limpar)", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b");
    const ctx = makeCtx(user.id, user.email, org);
    const project = await createTestProject(org.id, { description: "Tinha descricao" });

    const updated = await updateProject(ctx, project.id, { description: null });

    expect(updated.description).toBeNull();
  });

  it("lanca ProjectNotFoundError para projeto de outra org (cross-tenant)", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-c1");
    const org2 = await createOrgWithMembership(user.id, "org-c2");

    const project = await createTestProject(org1.id, { name: "Projeto Org1" });
    const ctx2 = makeCtx(user.id, user.email, org2);

    await expect(
      updateProject(ctx2, project.id, { name: "Hack" })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("lanca ProjectNotFoundError para id inexistente", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-d");
    const ctx = makeCtx(user.id, user.email, org);

    await expect(
      updateProject(ctx, "00000000-0000-0000-0000-000000000000", { name: "X" })
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("ProjectNotFoundError.status === 404", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-e");
    const ctx = makeCtx(user.id, user.email, org);

    try {
      await updateProject(ctx, "00000000-0000-0000-0000-000000000000", { name: "X" });
      throw new Error("Deveria ter lancado ProjectNotFoundError");
    } catch (err) {
      expect(err).toBeInstanceOf(ProjectNotFoundError);
      expect((err as ProjectNotFoundError).status).toBe(404);
    }
  });
});

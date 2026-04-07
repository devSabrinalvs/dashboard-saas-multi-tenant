/**
 * Testes de integracao - createProject use-case
 */
import { createProject } from "@/server/use-cases/create-project";
import { Role } from "@/generated/prisma/enums";
import type { OrgContext } from "@/server/org/require-org-context";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
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

describe("createProject()", () => {
  it("cria projeto com nome e salva no banco", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-a");
    const ctx = makeCtx(user.id, user.email, org);

    const project = await createProject(ctx, { name: "Meu Projeto" });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Meu Projeto");
    expect(project.orgId).toBe(org.id);
    expect(project.description).toBeNull();

    const inDb = await testPrisma.project.findUnique({ where: { id: project.id } });
    expect(inDb).not.toBeNull();
    expect(inDb?.name).toBe("Meu Projeto");
  });

  it("cria projeto com descricao opcional", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b");
    const ctx = makeCtx(user.id, user.email, org);

    const project = await createProject(ctx, {
      name: "Com Descricao",
      description: "Descricao detalhada",
    });

    expect(project.description).toBe("Descricao detalhada");
  });

  it("projeto criado pertence a org do contexto", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-c");
    const ctx = makeCtx(user.id, user.email, org);

    const project = await createProject(ctx, { name: "Projeto Isolado" });

    expect(project.orgId).toBe(org.id);
  });

  it("dois projetos com mesmo nome em orgs diferentes sao independentes", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-d1");
    const org2 = await createOrgWithMembership(user.id, "org-d2");

    const ctx1 = makeCtx(user.id, user.email, org1);
    const ctx2 = makeCtx(user.id, user.email, org2);

    const p1 = await createProject(ctx1, { name: "Same Name" });
    const p2 = await createProject(ctx2, { name: "Same Name" });

    expect(p1.id).not.toBe(p2.id);
    expect(p1.orgId).toBe(org1.id);
    expect(p2.orgId).toBe(org2.id);
  });
});

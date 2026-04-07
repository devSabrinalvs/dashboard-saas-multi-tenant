/**
 * Testes de integracao - listProjects use-case
 */
import { listProjects } from "@/server/use-cases/list-projects";
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

describe("listProjects()", () => {
  it("retorna lista vazia quando nao ha projetos", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-a");
    const ctx = makeCtx(user.id, user.email, org);

    const result = await listProjects(ctx, { page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("retorna projetos da org corretamente paginados", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b");
    const ctx = makeCtx(user.id, user.email, org);

    await createTestProject(org.id, { name: "Projeto Alpha" });
    await createTestProject(org.id, { name: "Projeto Beta" });
    await createTestProject(org.id, { name: "Projeto Gamma" });

    const result = await listProjects(ctx, { page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it("filtra projetos por busca de nome", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-c");
    const ctx = makeCtx(user.id, user.email, org);

    await createTestProject(org.id, { name: "Dashboard" });
    await createTestProject(org.id, { name: "API Backend" });

    const result = await listProjects(ctx, { search: "dash", page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Dashboard");
  });

  it("isolamento de tenant: org2 nao ve projetos de org1", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-d1");
    const org2 = await createOrgWithMembership(user.id, "org-d2");

    await createTestProject(org1.id, { name: "Projeto da Org1" });

    const ctx2 = makeCtx(user.id, user.email, org2);
    const result = await listProjects(ctx2, { page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("paginacao: pageSize=2 retorna apenas 2 itens de 3", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-e");
    const ctx = makeCtx(user.id, user.email, org);

    await createTestProject(org.id, { name: "P1" });
    await createTestProject(org.id, { name: "P2" });
    await createTestProject(org.id, { name: "P3" });

    const result = await listProjects(ctx, { page: 1, pageSize: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(2);
  });
});

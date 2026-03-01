/**
 * Testes de integração — organization repo
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 * Executar com: pnpm test:int
 */
import { findOrgsByUserId } from "@/server/repo/organization-repo";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
} from "@tests/helpers/db";
import { Role } from "@/generated/prisma/enums";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("findOrgsByUserId()", () => {
  it("retorna array vazio para usuário sem memberships", async () => {
    const user = await createTestUser("no-orgs@test.com");

    const orgs = await findOrgsByUserId(user.id);

    expect(orgs).toEqual([]);
  });

  it("retorna as 2 orgs de um usuário com 2 memberships", async () => {
    const user = await createTestUser("two-orgs@test.com");
    await createOrgWithMembership(user.id, "org-alpha", Role.OWNER);
    await createOrgWithMembership(user.id, "org-beta", Role.MEMBER);

    const orgs = await findOrgsByUserId(user.id);

    expect(orgs).toHaveLength(2);
    const slugs = orgs.map((o) => o.slug);
    expect(slugs).toContain("org-alpha");
    expect(slugs).toContain("org-beta");
  });

  it("não retorna orgs de outro usuário", async () => {
    const userA = await createTestUser("user-a@test.com");
    const userB = await createTestUser("user-b@test.com");

    await createOrgWithMembership(userA.id, "org-exclusiva-a", Role.OWNER);
    await createOrgWithMembership(userB.id, "org-exclusiva-b", Role.OWNER);

    const orgsA = await findOrgsByUserId(userA.id);
    const orgsB = await findOrgsByUserId(userB.id);

    expect(orgsA).toHaveLength(1);
    expect(orgsA[0].slug).toBe("org-exclusiva-a");

    expect(orgsB).toHaveLength(1);
    expect(orgsB[0].slug).toBe("org-exclusiva-b");
  });

  it("retorna orgs na ordem de entrada (membership mais antigo primeiro)", async () => {
    const user = await createTestUser("ordered@test.com");

    // Cria em sequência para garantir createdAt diferente
    await createOrgWithMembership(user.id, "org-first", Role.OWNER);
    // Pequena espera para garantir timestamps distintos em ambientes rápidos
    await new Promise((resolve) => setTimeout(resolve, 10));
    await createOrgWithMembership(user.id, "org-second", Role.MEMBER);

    const orgs = await findOrgsByUserId(user.id);

    expect(orgs).toHaveLength(2);
    expect(orgs[0].slug).toBe("org-first");
    expect(orgs[1].slug).toBe("org-second");
  });

  it("usuário com 1 membership retorna exatamente 1 org", async () => {
    const user = await createTestUser("one-org@test.com");
    const created = await createOrgWithMembership(
      user.id,
      "org-single",
      Role.VIEWER
    );

    const orgs = await findOrgsByUserId(user.id);

    expect(orgs).toHaveLength(1);
    expect(orgs[0].slug).toBe(created.slug);
    expect(orgs[0].name).toBe(created.name);
  });
});

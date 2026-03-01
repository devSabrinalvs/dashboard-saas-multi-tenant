/**
 * Testes de integração — createOrganization use-case
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 * Executar com: pnpm test:int
 */
import {
  createOrganization,
  SlugConflictError,
} from "@/server/use-cases/create-organization";
import { testPrisma, resetDb, createTestUser } from "@tests/helpers/db";
import { Role } from "@/generated/prisma/enums";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("createOrganization()", () => {
  it("cria Organization + Membership OWNER em transação", async () => {
    const user = await createTestUser("owner@test.com");

    const result = await createOrganization({
      name: "Minha Empresa",
      slug: "minha-empresa",
      userId: user.id,
    });

    expect(result.orgSlug).toBe("minha-empresa");

    // Verifica que a org foi criada no banco
    const org = await testPrisma.organization.findUnique({
      where: { slug: "minha-empresa" },
    });
    expect(org).not.toBeNull();
    expect(org?.name).toBe("Minha Empresa");

    // Verifica que o membership OWNER foi criado
    const membership = await testPrisma.membership.findUnique({
      where: { userId_orgId: { userId: user.id, orgId: org!.id } },
    });
    expect(membership).not.toBeNull();
    expect(membership?.role).toBe(Role.OWNER);
  });

  it("gera slug automático quando slug não é informado — via use-case direto com slug já calculado", async () => {
    // O slug auto-gerado é responsabilidade do createOrgApiSchema (Zod transform).
    // O use-case recebe o slug pronto. Aqui verificamos que ele persiste
    // corretamente o slug fornecido, seja manualmente ou via slugify.
    const user = await createTestUser("auto@test.com");
    const { slugify } = await import("@/shared/utils/slugify");

    const name = "Empresa com Ação";
    const autoSlug = slugify(name);

    const result = await createOrganization({
      name,
      slug: autoSlug,
      userId: user.id,
    });

    expect(result.orgSlug).toBe(autoSlug);
    const org = await testPrisma.organization.findUnique({
      where: { slug: autoSlug },
    });
    expect(org).not.toBeNull();
    expect(org?.name).toBe(name);
  });

  it("lança SlugConflictError quando o slug já está em uso", async () => {
    const user = await createTestUser("conflict@test.com");

    // Cria a primeira org com o slug
    await createOrganization({
      name: "Org Original",
      slug: "slug-unico",
      userId: user.id,
    });

    // Segunda tentativa com o mesmo slug por outro usuário
    const user2 = await createTestUser("conflict2@test.com");
    await expect(
      createOrganization({
        name: "Outra Org",
        slug: "slug-unico",
        userId: user2.id,
      })
    ).rejects.toBeInstanceOf(SlugConflictError);
  });

  it("SlugConflictError tem status 409", async () => {
    const user = await createTestUser("status409@test.com");
    await createOrganization({ name: "Org A", slug: "org-a", userId: user.id });

    const user2 = await createTestUser("status409b@test.com");
    try {
      await createOrganization({
        name: "Org B",
        slug: "org-a",
        userId: user2.id,
      });
      fail("Deveria ter lançado SlugConflictError");
    } catch (err) {
      expect(err).toBeInstanceOf(SlugConflictError);
      expect((err as SlugConflictError).status).toBe(409);
    }
  });

  it("constraint UNIQUE (userId, orgId): rejeita membership duplicado no banco", async () => {
    const user = await createTestUser("unique-constraint@test.com");

    // Cria a org e o primeiro membership via helper direto
    const org = await testPrisma.organization.create({
      data: { name: "Org Constraint", slug: "org-constraint" },
    });
    await testPrisma.membership.create({
      data: { userId: user.id, orgId: org.id, role: Role.OWNER },
    });

    // Tentar criar um segundo membership para o mesmo (userId, orgId) deve falhar
    await expect(
      testPrisma.membership.create({
        data: { userId: user.id, orgId: org.id, role: Role.MEMBER },
      })
    ).rejects.toThrow();
  });

  it("mesmo usuário pode ser OWNER em orgs diferentes (slugs distintos)", async () => {
    const user = await createTestUser("multi-org@test.com");

    await createOrganization({
      name: "Org Um",
      slug: "org-um",
      userId: user.id,
    });
    await createOrganization({
      name: "Org Dois",
      slug: "org-dois",
      userId: user.id,
    });

    const orgUm = await testPrisma.organization.findUnique({
      where: { slug: "org-um" },
    });
    const orgDois = await testPrisma.organization.findUnique({
      where: { slug: "org-dois" },
    });
    expect(orgUm).not.toBeNull();
    expect(orgDois).not.toBeNull();
  });
});

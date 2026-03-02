/**
 * Testes de integração — removeMember use-case
 * Executar com: pnpm test:int
 */
import { removeMember } from "@/server/use-cases/remove-member";
import {
  LastOwnerError,
  MemberNotFoundError,
} from "@/server/errors/team-errors";
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
  role: Role
): OrgContext {
  return {
    userId,
    email,
    orgId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    role,
  };
}

async function getMembershipId(userId: string, orgId: string) {
  const m = await testPrisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!m) throw new Error("Membership não encontrada no DB");
  return m.id;
}

describe("removeMember()", () => {
  it("OWNER remove MEMBER com sucesso — membership deletada do DB", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a", Role.OWNER);
    const member = await createTestUser("member@test.com");
    await testPrisma.membership.create({
      data: { userId: member.id, orgId: org.id, role: Role.MEMBER },
    });

    const membershipId = await getMembershipId(member.id, org.id);
    const ctx = makeCtx(owner.id, owner.email, org, Role.OWNER);

    await removeMember({
      orgId: org.id,
      actorCtx: ctx,
      targetMemberId: membershipId,
    });

    const deleted = await testPrisma.membership.findUnique({
      where: { id: membershipId },
    });
    expect(deleted).toBeNull();
  });

  it("lança LastOwnerError ao tentar remover o único OWNER", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-b", Role.OWNER);
    const membershipId = await getMembershipId(owner.id, org.id);
    const ctx = makeCtx(owner.id, owner.email, org, Role.OWNER);

    await expect(
      removeMember({
        orgId: org.id,
        actorCtx: ctx,
        targetMemberId: membershipId,
      })
    ).rejects.toBeInstanceOf(LastOwnerError);
  });

  it("LastOwnerError.status === 422", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-c", Role.OWNER);
    const membershipId = await getMembershipId(owner.id, org.id);
    const ctx = makeCtx(owner.id, owner.email, org, Role.OWNER);

    try {
      await removeMember({
        orgId: org.id,
        actorCtx: ctx,
        targetMemberId: membershipId,
      });
      throw new Error("Deveria ter lançado LastOwnerError");
    } catch (err) {
      expect(err).toBeInstanceOf(LastOwnerError);
      expect((err as LastOwnerError).status).toBe(422);
    }
  });

  it("OWNER pode se remover quando há 2 OWNERs", async () => {
    const owner1 = await createTestUser("owner1@test.com");
    const org = await createOrgWithMembership(owner1.id, "org-d", Role.OWNER);
    const owner2 = await createTestUser("owner2@test.com");
    await testPrisma.membership.create({
      data: { userId: owner2.id, orgId: org.id, role: Role.OWNER },
    });

    const membershipId = await getMembershipId(owner1.id, org.id);
    const ctx = makeCtx(owner1.id, owner1.email, org, Role.OWNER);

    await removeMember({
      orgId: org.id,
      actorCtx: ctx,
      targetMemberId: membershipId,
    });

    const deleted = await testPrisma.membership.findUnique({
      where: { id: membershipId },
    });
    expect(deleted).toBeNull();
  });

  it("lança MemberNotFoundError para memberId de outra org (cross-tenant)", async () => {
    const owner = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(owner.id, "org-e1", Role.OWNER);
    const org2 = await createOrgWithMembership(owner.id, "org-e2", Role.OWNER);

    const membershipIdInOrg1 = await getMembershipId(owner.id, org1.id);
    const ctx = makeCtx(owner.id, owner.email, org2, Role.OWNER);

    await expect(
      removeMember({
        orgId: org2.id,
        actorCtx: ctx,
        targetMemberId: membershipIdInOrg1,
      })
    ).rejects.toBeInstanceOf(MemberNotFoundError);
  });

  it("lança MemberNotFoundError para memberId inexistente", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-f", Role.OWNER);
    const ctx = makeCtx(owner.id, owner.email, org, Role.OWNER);

    await expect(
      removeMember({
        orgId: org.id,
        actorCtx: ctx,
        targetMemberId: "id-inexistente",
      })
    ).rejects.toBeInstanceOf(MemberNotFoundError);
  });
});

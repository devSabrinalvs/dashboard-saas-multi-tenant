/**
 * Testes de integração — updateMemberRole use-case
 * Executar com: pnpm test:int
 */
import { updateMemberRole } from "@/server/use-cases/update-member-role";
import {
  LastOwnerError,
  AdminCannotPromoteError,
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
    plan: "FREE" as const,
  };
}

async function getMembershipId(userId: string, orgId: string) {
  const m = await testPrisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!m) throw new Error("Membership não encontrada no DB");
  return m.id;
}

describe("updateMemberRole()", () => {
  it("OWNER muda role de MEMBER para ADMIN", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a", Role.OWNER);
    const member = await createTestUser("member@test.com");
    await testPrisma.membership.create({
      data: { userId: member.id, orgId: org.id, role: Role.MEMBER },
    });

    const membershipId = await getMembershipId(member.id, org.id);
    const ctx = makeCtx(owner.id, owner.email, org, Role.OWNER);

    await updateMemberRole({
      orgId: org.id,
      actorCtx: ctx,
      targetMemberId: membershipId,
      newRole: Role.ADMIN,
    });

    const updated = await testPrisma.membership.findUnique({
      where: { id: membershipId },
    });
    expect(updated?.role).toBe(Role.ADMIN);
  });

  it("OWNER pode rebaixar outro OWNER quando há 2 OWNERs", async () => {
    const owner1 = await createTestUser("owner1@test.com");
    const org = await createOrgWithMembership(owner1.id, "org-b", Role.OWNER);
    const owner2 = await createTestUser("owner2@test.com");
    await testPrisma.membership.create({
      data: { userId: owner2.id, orgId: org.id, role: Role.OWNER },
    });

    const membershipId = await getMembershipId(owner2.id, org.id);
    const ctx = makeCtx(owner1.id, owner1.email, org, Role.OWNER);

    await updateMemberRole({
      orgId: org.id,
      actorCtx: ctx,
      targetMemberId: membershipId,
      newRole: Role.ADMIN,
    });

    const updated = await testPrisma.membership.findUnique({
      where: { id: membershipId },
    });
    expect(updated?.role).toBe(Role.ADMIN);
  });

  it("lança LastOwnerError ao tentar rebaixar o único OWNER", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-c", Role.OWNER);
    const membershipId = await getMembershipId(owner.id, org.id);
    const ctx = makeCtx(owner.id, owner.email, org, Role.OWNER);

    await expect(
      updateMemberRole({
        orgId: org.id,
        actorCtx: ctx,
        targetMemberId: membershipId,
        newRole: Role.ADMIN,
      })
    ).rejects.toBeInstanceOf(LastOwnerError);
  });

  it("LastOwnerError.status === 422", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-d", Role.OWNER);
    const membershipId = await getMembershipId(owner.id, org.id);
    const ctx = makeCtx(owner.id, owner.email, org, Role.OWNER);

    try {
      await updateMemberRole({
        orgId: org.id,
        actorCtx: ctx,
        targetMemberId: membershipId,
        newRole: Role.ADMIN,
      });
      throw new Error("Deveria ter lançado LastOwnerError");
    } catch (err) {
      expect(err).toBeInstanceOf(LastOwnerError);
      expect((err as LastOwnerError).status).toBe(422);
    }
  });

  it("ADMIN pode mudar MEMBER para ADMIN", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-e", Role.OWNER);
    const admin = await createTestUser("admin@test.com");
    await testPrisma.membership.create({
      data: { userId: admin.id, orgId: org.id, role: Role.ADMIN },
    });
    const member = await createTestUser("member@test.com");
    await testPrisma.membership.create({
      data: { userId: member.id, orgId: org.id, role: Role.MEMBER },
    });

    const membershipId = await getMembershipId(member.id, org.id);
    const ctx = makeCtx(admin.id, admin.email, org, Role.ADMIN);

    await updateMemberRole({
      orgId: org.id,
      actorCtx: ctx,
      targetMemberId: membershipId,
      newRole: Role.ADMIN,
    });

    const updated = await testPrisma.membership.findUnique({
      where: { id: membershipId },
    });
    expect(updated?.role).toBe(Role.ADMIN);
  });

  it("ADMIN não pode promover para OWNER → AdminCannotPromoteError (403)", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-f", Role.OWNER);
    const admin = await createTestUser("admin@test.com");
    await testPrisma.membership.create({
      data: { userId: admin.id, orgId: org.id, role: Role.ADMIN },
    });
    const member = await createTestUser("member@test.com");
    await testPrisma.membership.create({
      data: { userId: member.id, orgId: org.id, role: Role.MEMBER },
    });

    const membershipId = await getMembershipId(member.id, org.id);
    const ctx = makeCtx(admin.id, admin.email, org, Role.ADMIN);

    await expect(
      updateMemberRole({
        orgId: org.id,
        actorCtx: ctx,
        targetMemberId: membershipId,
        newRole: Role.OWNER,
      })
    ).rejects.toBeInstanceOf(AdminCannotPromoteError);
  });

  it("lança MemberNotFoundError para memberId de outra org (cross-tenant)", async () => {
    const owner = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(owner.id, "org-g1", Role.OWNER);
    const org2 = await createOrgWithMembership(owner.id, "org-g2", Role.OWNER);

    const membershipIdInOrg1 = await getMembershipId(owner.id, org1.id);
    const ctx = makeCtx(owner.id, owner.email, org2, Role.OWNER);

    await expect(
      updateMemberRole({
        orgId: org2.id,
        actorCtx: ctx,
        targetMemberId: membershipIdInOrg1,
        newRole: Role.ADMIN,
      })
    ).rejects.toBeInstanceOf(MemberNotFoundError);
  });

  it("lança MemberNotFoundError para memberId inexistente", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-h", Role.OWNER);
    const ctx = makeCtx(owner.id, owner.email, org, Role.OWNER);

    await expect(
      updateMemberRole({
        orgId: org.id,
        actorCtx: ctx,
        targetMemberId: "id-inexistente",
        newRole: Role.ADMIN,
      })
    ).rejects.toBeInstanceOf(MemberNotFoundError);
  });
});

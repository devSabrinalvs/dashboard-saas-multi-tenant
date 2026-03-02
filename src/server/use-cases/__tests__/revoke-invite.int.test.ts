/**
 * Testes de integração — revokeInvite use-case
 * Executar com: pnpm test:int
 */
import { revokeInvite } from "@/server/use-cases/revoke-invite";
import { InviteNotFoundError } from "@/server/errors/team-errors";
import { InviteStatus } from "@/generated/prisma/enums";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
  createTestInvite,
} from "@tests/helpers/db";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("revokeInvite()", () => {
  it("marca convite PENDING como REVOKED", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-revoke");
    const invite = await createTestInvite(org.id, "convidado@test.com");

    await revokeInvite({ orgId: org.id, inviteId: invite.id });

    const updated = await testPrisma.invite.findUnique({
      where: { id: invite.id },
    });
    expect(updated?.status).toBe(InviteStatus.REVOKED);
  });

  it("lança InviteNotFoundError se convite não existe", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-revoke2");

    await expect(
      revokeInvite({ orgId: org.id, inviteId: "id-inexistente" })
    ).rejects.toBeInstanceOf(InviteNotFoundError);
  });

  it("lança InviteNotFoundError se convite pertence a outra org (cross-tenant)", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-r1");
    const org2 = await createOrgWithMembership(user.id, "org-r2");

    const invite = await createTestInvite(org1.id, "convidado@test.com");

    await expect(
      revokeInvite({ orgId: org2.id, inviteId: invite.id })
    ).rejects.toBeInstanceOf(InviteNotFoundError);
  });

  it("lança InviteNotFoundError se convite já está ACCEPTED", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-revoke3");
    const invite = await createTestInvite(org.id, "convidado@test.com", {
      status: InviteStatus.ACCEPTED,
    });

    await expect(
      revokeInvite({ orgId: org.id, inviteId: invite.id })
    ).rejects.toBeInstanceOf(InviteNotFoundError);
  });
});

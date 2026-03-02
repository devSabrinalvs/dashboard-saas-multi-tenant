/**
 * Testes de integração — acceptInvite use-case
 * Executar com: pnpm test:int
 */
import { acceptInvite } from "@/server/use-cases/accept-invite";
import {
  InviteNotFoundError,
  InviteExpiredError,
  InviteEmailMismatchError,
} from "@/server/errors/team-errors";
import { InviteStatus, Role } from "@/generated/prisma/enums";
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

describe("acceptInvite()", () => {
  it("happy path: cria membership MEMBER e marca convite como ACCEPTED", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a");
    const invitee = await createTestUser("invitee@test.com");
    const invite = await createTestInvite(org.id, invitee.email);

    const result = await acceptInvite({
      token: invite.token,
      userId: invitee.id,
      userEmail: invitee.email,
    });

    expect(result.orgSlug).toBe(org.slug);
    expect(result.orgName).toBeDefined();

    const membership = await testPrisma.membership.findUnique({
      where: { userId_orgId: { userId: invitee.id, orgId: org.id } },
    });
    expect(membership).not.toBeNull();
    expect(membership?.role).toBe(Role.MEMBER);

    const updatedInvite = await testPrisma.invite.findUnique({
      where: { id: invite.id },
    });
    expect(updatedInvite?.status).toBe(InviteStatus.ACCEPTED);
    expect(updatedInvite?.acceptedAt).not.toBeNull();
  });

  it("comparação de email é case-insensitive", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-b");
    const invitee = await createTestUser("Invitee@Test.COM");
    const invite = await createTestInvite(org.id, "invitee@test.com");

    await expect(
      acceptInvite({
        token: invite.token,
        userId: invitee.id,
        userEmail: "Invitee@Test.COM",
      })
    ).resolves.not.toThrow();
  });

  it("lança InviteEmailMismatchError se email diferente (403)", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-c");
    const invite = await createTestInvite(org.id, "original@test.com");
    const outroUser = await createTestUser("outro@test.com");

    await expect(
      acceptInvite({
        token: invite.token,
        userId: outroUser.id,
        userEmail: outroUser.email,
      })
    ).rejects.toBeInstanceOf(InviteEmailMismatchError);
  });

  it("InviteEmailMismatchError.status === 403", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-d");
    const invite = await createTestInvite(org.id, "original@test.com");
    const outroUser = await createTestUser("outro@test.com");

    try {
      await acceptInvite({
        token: invite.token,
        userId: outroUser.id,
        userEmail: outroUser.email,
      });
      throw new Error("Deveria ter lançado InviteEmailMismatchError");
    } catch (err) {
      expect(err).toBeInstanceOf(InviteEmailMismatchError);
      expect((err as InviteEmailMismatchError).status).toBe(403);
    }
  });

  it("lança InviteNotFoundError para token inexistente (404)", async () => {
    const user = await createTestUser("user@test.com");

    await expect(
      acceptInvite({
        token: "token-inexistente",
        userId: user.id,
        userEmail: user.email,
      })
    ).rejects.toBeInstanceOf(InviteNotFoundError);
  });

  it("lança InviteExpiredError para token expirado (400)", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-e");
    const invitee = await createTestUser("invitee@test.com");
    const invite = await createTestInvite(org.id, invitee.email, {
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      acceptInvite({
        token: invite.token,
        userId: invitee.id,
        userEmail: invitee.email,
      })
    ).rejects.toBeInstanceOf(InviteExpiredError);
  });

  it("lança InviteNotFoundError para convite REVOKED (404)", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-f");
    const invitee = await createTestUser("invitee@test.com");
    const invite = await createTestInvite(org.id, invitee.email, {
      status: InviteStatus.REVOKED,
    });

    await expect(
      acceptInvite({
        token: invite.token,
        userId: invitee.id,
        userEmail: invitee.email,
      })
    ).rejects.toBeInstanceOf(InviteNotFoundError);
  });

  it("idempotente: aceitar duas vezes retorna ok e não duplica membership", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-g");
    const invitee = await createTestUser("invitee@test.com");
    const invite = await createTestInvite(org.id, invitee.email);

    // Primeira aceitação
    await acceptInvite({
      token: invite.token,
      userId: invitee.id,
      userEmail: invitee.email,
    });

    // Segunda aceitação — deve retornar sem erro
    const result = await acceptInvite({
      token: invite.token,
      userId: invitee.id,
      userEmail: invitee.email,
    });
    expect(result.orgSlug).toBe(org.slug);

    // Não deve ter duplicado o membership
    const memberships = await testPrisma.membership.findMany({
      where: { userId: invitee.id, orgId: org.id },
    });
    expect(memberships).toHaveLength(1);
  });
});

/**
 * Testes de integração — createInvite use-case
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 * Executar com: pnpm test:int
 */
import { createInvite } from "@/server/use-cases/create-invite";
import { InviteDuplicateError } from "@/server/errors/team-errors";
import { InviteStatus, Role } from "@/generated/prisma/enums";
import type { OrgContext } from "@/server/org/require-org-context";
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

function makeCtx(
  userId: string,
  email: string,
  org: { id: string; slug: string; name: string },
  role: Role = Role.OWNER
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

describe("createInvite()", () => {
  it("cria convite com status PENDING, token gerado e expiresAt ~7 dias", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-a");
    const ctx = makeCtx(user.id, user.email, org);

    const result = await createInvite(ctx, "convidado@test.com");

    expect(result.inviteId).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.inviteLink).toBe(`/invite/${result.token}`);

    const invite = await testPrisma.invite.findUnique({
      where: { id: result.inviteId },
    });
    expect(invite).not.toBeNull();
    expect(invite?.status).toBe(InviteStatus.PENDING);
    expect(invite?.email).toBe("convidado@test.com");

    const diffMs = invite!.expiresAt.getTime() - Date.now();
    const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
    const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
    expect(diffMs).toBeGreaterThan(sixDaysMs);
    expect(diffMs).toBeLessThan(eightDaysMs);
  });

  it("lança InviteDuplicateError se já existe convite PENDING não expirado para o mesmo email+org", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b");
    const ctx = makeCtx(user.id, user.email, org);

    await createTestInvite(org.id, "convidado@test.com");

    await expect(
      createInvite(ctx, "convidado@test.com")
    ).rejects.toBeInstanceOf(InviteDuplicateError);
  });

  it("InviteDuplicateError.status === 409", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-c");
    const ctx = makeCtx(user.id, user.email, org);
    await createTestInvite(org.id, "dup@test.com");

    try {
      await createInvite(ctx, "dup@test.com");
      throw new Error("Deveria ter lançado InviteDuplicateError");
    } catch (err) {
      expect(err).toBeInstanceOf(InviteDuplicateError);
      expect((err as InviteDuplicateError).status).toBe(409);
    }
  });

  it("permite criar novo convite quando o anterior está expirado", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-d");
    const ctx = makeCtx(user.id, user.email, org);

    // Cria invite já expirado
    await createTestInvite(org.id, "convidado@test.com", {
      expiresAt: new Date(Date.now() - 1000),
    });

    // Deve funcionar — invite expirado não bloqueia
    const result = await createInvite(ctx, "convidado@test.com");
    expect(result.inviteId).toBeDefined();
  });

  it("mesmo email pode ser convidado em orgs diferentes", async () => {
    const user = await createTestUser("owner@test.com");
    const org1 = await createOrgWithMembership(user.id, "org-e1");
    const org2 = await createOrgWithMembership(user.id, "org-e2");

    const ctx1 = makeCtx(user.id, user.email, org1);
    const ctx2 = makeCtx(user.id, user.email, org2);

    const r1 = await createInvite(ctx1, "shared@test.com");
    const r2 = await createInvite(ctx2, "shared@test.com");

    expect(r1.inviteId).not.toBe(r2.inviteId);
    expect(r1.token).not.toBe(r2.token);
  });

  it("token gerado é único (UUIDs distintos por chamada)", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-f");
    const ctx = makeCtx(user.id, user.email, org);

    const r1 = await createInvite(ctx, "a@test.com");
    const r2 = await createInvite(ctx, "b@test.com");

    expect(r1.token).not.toBe(r2.token);
  });
});

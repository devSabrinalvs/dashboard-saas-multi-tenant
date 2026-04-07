/**
 * Integration tests para Admin Console — Etapa P.
 *
 * Testa:
 * - adminUnlockUserUseCase
 * - adminRevokeUserSessionsUseCase
 * - adminVerifyUserEmailUseCase
 * - adminDisableUser2FAUseCase
 * - adminForceOrgPlanUseCase
 * - AdminAuditLog criado em todas as ações
 * - Erros de confirmação (confirm mismatch)
 * - Usuário não encontrado
 */

import {
  resetDb,
  testPrisma,
  createTestUser,
  createOrgWithMembership,
  createTestSessionMeta,
} from "@tests/helpers/db";

import { adminUnlockUserUseCase, AdminUserNotFoundError, AdminConfirmMismatchError } from "@/server/use-cases/admin/unlock-user";
import { adminRevokeUserSessionsUseCase } from "@/server/use-cases/admin/revoke-user-sessions";
import { adminVerifyUserEmailUseCase } from "@/server/use-cases/admin/verify-user-email";
import { adminDisableUser2FAUseCase } from "@/server/use-cases/admin/disable-user-2fa";
import { adminForceOrgPlanUseCase, AdminOrgNotFoundError, AdminOrgConfirmMismatchError } from "@/server/use-cases/admin/force-org-plan";

const ADMIN_EMAIL = "superadmin@empresa.com";

beforeEach(async () => {
  await resetDb();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getLastAuditLog() {
  const rows = await testPrisma.$queryRaw<{ action: string; actorAdminEmail: string; targetType: string; targetId: string; metadata: unknown }[]>`
    SELECT action, "actorAdminEmail", "targetType", "targetId", metadata
    FROM "AdminAuditLog"
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Unlock user
// ---------------------------------------------------------------------------

describe("adminUnlockUserUseCase", () => {
  it("reseta failedLoginCount e lockedUntil", async () => {
    const user = await createTestUser("locked@test.com", {
      failedLoginCount: 10,
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await adminUnlockUserUseCase(ADMIN_EMAIL, user.id, "locked@test.com");

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.failedLoginCount).toBe(0);
    expect(updated?.lockedUntil).toBeNull();
    expect(updated?.lastFailedLoginAt).toBeNull();
  });

  it("cria AdminAuditLog com ação correta", async () => {
    const user = await createTestUser("locked2@test.com", { failedLoginCount: 5 });

    await adminUnlockUserUseCase(ADMIN_EMAIL, user.id, "locked2@test.com");

    const log = await getLastAuditLog();
    expect(log).not.toBeNull();
    expect(log!.action).toBe("admin.user.unlock");
    expect(log!.actorAdminEmail).toBe(ADMIN_EMAIL);
    expect(log!.targetType).toBe("user");
    expect(log!.targetId).toBe(user.id);
  });

  it("lança AdminUserNotFoundError para userId inexistente", async () => {
    await expect(
      adminUnlockUserUseCase(ADMIN_EMAIL, "id-inexistente", "qualquer@email.com")
    ).rejects.toThrow(AdminUserNotFoundError);
  });

  it("lança AdminConfirmMismatchError quando confirm não bate com email", async () => {
    const user = await createTestUser("real@test.com");

    await expect(
      adminUnlockUserUseCase(ADMIN_EMAIL, user.id, "errado@test.com")
    ).rejects.toThrow(AdminConfirmMismatchError);
  });

  it("confirmação é case-insensitive", async () => {
    const user = await createTestUser("mixedcase@test.com", { failedLoginCount: 5 });

    await expect(
      adminUnlockUserUseCase(ADMIN_EMAIL, user.id, "MIXEDCASE@TEST.COM")
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Revoke sessions
// ---------------------------------------------------------------------------

describe("adminRevokeUserSessionsUseCase", () => {
  it("revoga todas as sessões ativas do usuário", async () => {
    const user = await createTestUser("sessions@test.com");
    await createTestSessionMeta(user.id, "sess-1");
    await createTestSessionMeta(user.id, "sess-2");

    const count = await adminRevokeUserSessionsUseCase(ADMIN_EMAIL, user.id, "sessions@test.com");
    expect(count).toBe(2);

    const meta1 = await testPrisma.userSessionMeta.findUnique({ where: { sessionId: "sess-1" } });
    const meta2 = await testPrisma.userSessionMeta.findUnique({ where: { sessionId: "sess-2" } });
    expect(meta1?.revokedAt).not.toBeNull();
    expect(meta2?.revokedAt).not.toBeNull();
  });

  it("retorna 0 quando não há sessões ativas", async () => {
    const user = await createTestUser("nosessions@test.com");
    const count = await adminRevokeUserSessionsUseCase(ADMIN_EMAIL, user.id, "nosessions@test.com");
    expect(count).toBe(0);
  });

  it("cria AdminAuditLog com revokedCount no metadata", async () => {
    const user = await createTestUser("revoke-audit@test.com");
    await createTestSessionMeta(user.id, "sess-audit-1");

    await adminRevokeUserSessionsUseCase(ADMIN_EMAIL, user.id, "revoke-audit@test.com");

    const log = await getLastAuditLog();
    expect(log!.action).toBe("admin.user.revoke_sessions");
    const meta = log!.metadata as { revokedCount: number };
    expect(meta.revokedCount).toBe(1);
  });

  it("lança AdminConfirmMismatchError quando confirm errado", async () => {
    const user = await createTestUser("real2@test.com");
    await expect(
      adminRevokeUserSessionsUseCase(ADMIN_EMAIL, user.id, "wrong@test.com")
    ).rejects.toThrow(AdminConfirmMismatchError);
  });
});

// ---------------------------------------------------------------------------
// Verify email
// ---------------------------------------------------------------------------

describe("adminVerifyUserEmailUseCase", () => {
  it("seta emailVerified para o usuário", async () => {
    const user = await createTestUser("unverified@test.com", { emailVerified: false });

    const before = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(before?.emailVerified).toBeNull();

    await adminVerifyUserEmailUseCase(ADMIN_EMAIL, user.id, "unverified@test.com");

    const after = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(after?.emailVerified).toBeInstanceOf(Date);
  });

  it("cria AdminAuditLog com ação admin.user.verify_email", async () => {
    const user = await createTestUser("verify-audit@test.com");

    await adminVerifyUserEmailUseCase(ADMIN_EMAIL, user.id, "verify-audit@test.com");

    const log = await getLastAuditLog();
    expect(log!.action).toBe("admin.user.verify_email");
    expect(log!.targetId).toBe(user.id);
  });

  it("lança AdminConfirmMismatchError para email errado", async () => {
    const user = await createTestUser("verify-mismatch@test.com");
    await expect(
      adminVerifyUserEmailUseCase(ADMIN_EMAIL, user.id, "other@test.com")
    ).rejects.toThrow(AdminConfirmMismatchError);
  });
});

// ---------------------------------------------------------------------------
// Disable 2FA
// ---------------------------------------------------------------------------

describe("adminDisableUser2FAUseCase", () => {
  it("limpa twoFactorEnabled, secret e recovery codes", async () => {
    const user = await createTestUser("with2fa@test.com", { twoFactorEnabled: true });

    // Simular 2FA ativo
    await testPrisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        totpSecretEncrypted: "encrypted-secret",
        twoFactorRecoveryCodeHashes: ["hash1", "hash2"],
        twoFactorEnabledAt: new Date(),
      },
    });

    await adminDisableUser2FAUseCase(ADMIN_EMAIL, user.id, "with2fa@test.com");

    const after = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(after?.twoFactorEnabled).toBe(false);
    expect(after?.totpSecretEncrypted).toBeNull();
    expect(after?.twoFactorTempSecretEncrypted).toBeNull();
    expect(after?.twoFactorEnabledAt).toBeNull();
    expect(after?.twoFactorRecoveryCodeHashes).toHaveLength(0);
  });

  it("cria AdminAuditLog com ação admin.user.disable_2fa", async () => {
    const user = await createTestUser("2fa-audit@test.com");

    await adminDisableUser2FAUseCase(ADMIN_EMAIL, user.id, "2fa-audit@test.com");

    const log = await getLastAuditLog();
    expect(log!.action).toBe("admin.user.disable_2fa");
  });

  it("lança AdminConfirmMismatchError para email errado", async () => {
    const user = await createTestUser("2fa-mismatch@test.com");
    await expect(
      adminDisableUser2FAUseCase(ADMIN_EMAIL, user.id, "wrong@test.com")
    ).rejects.toThrow(AdminConfirmMismatchError);
  });
});

// ---------------------------------------------------------------------------
// Force org plan
// ---------------------------------------------------------------------------

describe("adminForceOrgPlanUseCase", () => {
  it("altera o plano da organização", async () => {
    const user = await createTestUser("org-owner@test.com");
    const org = await createOrgWithMembership(user.id, "test-org-force");

    const before = await testPrisma.organization.findUnique({ where: { id: org.id } });
    expect(before?.plan).toBe("FREE");

    await adminForceOrgPlanUseCase(ADMIN_EMAIL, org.id, "PRO", "test-org-force");

    const after = await testPrisma.organization.findUnique({ where: { id: org.id } });
    expect(after?.plan).toBe("PRO");
    expect(after?.planUpdatedAt).toBeInstanceOf(Date);
  });

  it("cria AdminAuditLog com previousPlan e newPlan no metadata", async () => {
    const user = await createTestUser("audit-org@test.com");
    const org = await createOrgWithMembership(user.id, "audit-force-org");

    await adminForceOrgPlanUseCase(ADMIN_EMAIL, org.id, "BUSINESS", "audit-force-org");

    const log = await getLastAuditLog();
    expect(log!.action).toBe("admin.org.force_plan");
    expect(log!.targetType).toBe("org");
    expect(log!.targetId).toBe(org.id);
    const meta = log!.metadata as { previousPlan: string; newPlan: string; orgSlug: string };
    expect(meta.previousPlan).toBe("FREE");
    expect(meta.newPlan).toBe("BUSINESS");
    expect(meta.orgSlug).toBe("audit-force-org");
  });

  it("lança AdminOrgNotFoundError para orgId inexistente", async () => {
    await expect(
      adminForceOrgPlanUseCase(ADMIN_EMAIL, "id-inexistente", "PRO", "slug-qualquer")
    ).rejects.toThrow(AdminOrgNotFoundError);
  });

  it("lança AdminOrgConfirmMismatchError quando slug errado", async () => {
    const user = await createTestUser("slug-mismatch@test.com");
    const org = await createOrgWithMembership(user.id, "real-slug");

    await expect(
      adminForceOrgPlanUseCase(ADMIN_EMAIL, org.id, "PRO", "wrong-slug")
    ).rejects.toThrow(AdminOrgConfirmMismatchError);
  });

  it("confirm é case-insensitive", async () => {
    const user = await createTestUser("slug-case@test.com");
    const org = await createOrgWithMembership(user.id, "my-org");

    await expect(
      adminForceOrgPlanUseCase(ADMIN_EMAIL, org.id, "PRO", "MY-ORG")
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AdminAuditLog — garantir append-only
// ---------------------------------------------------------------------------

describe("AdminAuditLog — múltiplas ações", () => {
  it("cria log separado para cada ação executada", async () => {
    const user = await createTestUser("multi-action@test.com");

    await adminVerifyUserEmailUseCase(ADMIN_EMAIL, user.id, "multi-action@test.com");
    await adminRevokeUserSessionsUseCase(ADMIN_EMAIL, user.id, "multi-action@test.com");

    const rows = await testPrisma.$queryRaw<{ action: string }[]>`
      SELECT action FROM "AdminAuditLog"
      WHERE "targetId" = ${user.id}
      ORDER BY "createdAt" ASC
    `;

    expect(rows).toHaveLength(2);
    expect(rows[0].action).toBe("admin.user.verify_email");
    expect(rows[1].action).toBe("admin.user.revoke_sessions");
  });
});

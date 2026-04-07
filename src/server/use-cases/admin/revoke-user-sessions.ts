import { adminRevokeAllSessions, findAdminUserById } from "@/server/repo/admin-user-repo";
import { createAdminAuditLog } from "@/server/repo/admin-audit-repo";
import { AdminUserNotFoundError, AdminConfirmMismatchError } from "./unlock-user";

/**
 * Revoga todas as sessões ativas de um usuário.
 *
 * @returns número de sessões revogadas
 */
export async function adminRevokeUserSessionsUseCase(
  adminEmail: string,
  userId: string,
  confirm: string
): Promise<number> {
  const user = await findAdminUserById(userId);
  if (!user) throw new AdminUserNotFoundError();

  if (user.email.toLowerCase() !== confirm.toLowerCase()) {
    throw new AdminConfirmMismatchError();
  }

  const count = await adminRevokeAllSessions(userId);

  await createAdminAuditLog({
    actorAdminEmail: adminEmail,
    action: "admin.user.revoke_sessions",
    targetType: "user",
    targetId: userId,
    metadata: { email: user.email, revokedCount: count },
  });

  return count;
}

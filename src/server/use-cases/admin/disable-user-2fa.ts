import { adminDisable2FA, findAdminUserById } from "@/server/repo/admin-user-repo";
import { createAdminAuditLog } from "@/server/repo/admin-audit-repo";
import { AdminUserNotFoundError, AdminConfirmMismatchError } from "./unlock-user";

/**
 * Desativa 2FA de um usuário.
 * Ação perigosa: requer confirmação digitando o email do usuário.
 */
export async function adminDisableUser2FAUseCase(
  adminEmail: string,
  userId: string,
  confirm: string
): Promise<void> {
  const user = await findAdminUserById(userId);
  if (!user) throw new AdminUserNotFoundError();

  if (user.email.toLowerCase() !== confirm.toLowerCase()) {
    throw new AdminConfirmMismatchError();
  }

  await adminDisable2FA(userId);

  await createAdminAuditLog({
    actorAdminEmail: adminEmail,
    action: "admin.user.disable_2fa",
    targetType: "user",
    targetId: userId,
    metadata: { email: user.email },
  });
}

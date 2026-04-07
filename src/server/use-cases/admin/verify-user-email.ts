import { adminMarkEmailVerified, findAdminUserById } from "@/server/repo/admin-user-repo";
import { createAdminAuditLog } from "@/server/repo/admin-audit-repo";
import { AdminUserNotFoundError, AdminConfirmMismatchError } from "./unlock-user";

/**
 * Força a verificação do email de um usuário.
 * Ação perigosa: requer confirmação digitando o email do usuário.
 */
export async function adminVerifyUserEmailUseCase(
  adminEmail: string,
  userId: string,
  confirm: string
): Promise<void> {
  const user = await findAdminUserById(userId);
  if (!user) throw new AdminUserNotFoundError();

  if (user.email.toLowerCase() !== confirm.toLowerCase()) {
    throw new AdminConfirmMismatchError();
  }

  await adminMarkEmailVerified(userId);

  await createAdminAuditLog({
    actorAdminEmail: adminEmail,
    action: "admin.user.verify_email",
    targetType: "user",
    targetId: userId,
    metadata: { email: user.email },
  });
}

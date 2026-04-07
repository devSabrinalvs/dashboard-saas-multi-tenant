import { adminUnlockUser, findAdminUserById } from "@/server/repo/admin-user-repo";
import { createAdminAuditLog } from "@/server/repo/admin-audit-repo";

export class AdminUserNotFoundError extends Error {
  constructor() {
    super("Usuário não encontrado");
    this.name = "AdminUserNotFoundError";
  }
}

export class AdminConfirmMismatchError extends Error {
  constructor() {
    super("Email de confirmação não corresponde");
    this.name = "AdminConfirmMismatchError";
  }
}

/**
 * Desbloqueia um usuário: zera failedLoginCount e lockedUntil.
 *
 * @param adminEmail - email do admin que está executando a ação
 * @param userId - ID do usuário alvo
 * @param confirm - email digitado pelo admin para confirmar (deve ser igual ao email do usuário)
 */
export async function adminUnlockUserUseCase(
  adminEmail: string,
  userId: string,
  confirm: string
): Promise<void> {
  const user = await findAdminUserById(userId);
  if (!user) throw new AdminUserNotFoundError();

  if (user.email.toLowerCase() !== confirm.toLowerCase()) {
    throw new AdminConfirmMismatchError();
  }

  await adminUnlockUser(userId);

  await createAdminAuditLog({
    actorAdminEmail: adminEmail,
    action: "admin.user.unlock",
    targetType: "user",
    targetId: userId,
    metadata: { email: user.email },
  });
}

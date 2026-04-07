import type { Plan } from "@/generated/prisma/enums";
import { adminForceOrgPlan, findAdminOrgById } from "@/server/repo/admin-org-repo";
import { createAdminAuditLog } from "@/server/repo/admin-audit-repo";

export class AdminOrgNotFoundError extends Error {
  constructor() {
    super("Organização não encontrada");
    this.name = "AdminOrgNotFoundError";
  }
}

export class AdminOrgConfirmMismatchError extends Error {
  constructor() {
    super("Slug de confirmação não corresponde");
    this.name = "AdminOrgConfirmMismatchError";
  }
}

/**
 * Força o plano de uma organização (override administrativo).
 * Atenção: não altera o Stripe — apenas o campo local.
 * Documentar no audit log como override manual.
 *
 * @param confirm - slug da org digitado pelo admin para confirmar
 */
export async function adminForceOrgPlanUseCase(
  adminEmail: string,
  orgId: string,
  plan: Plan,
  confirm: string
): Promise<void> {
  const org = await findAdminOrgById(orgId);
  if (!org) throw new AdminOrgNotFoundError();

  if (org.slug.toLowerCase() !== confirm.toLowerCase()) {
    throw new AdminOrgConfirmMismatchError();
  }

  const previousPlan = org.plan;
  await adminForceOrgPlan(orgId, plan);

  await createAdminAuditLog({
    actorAdminEmail: adminEmail,
    action: "admin.org.force_plan",
    targetType: "org",
    targetId: orgId,
    metadata: {
      orgSlug: org.slug,
      orgName: org.name,
      previousPlan,
      newPlan: plan,
    },
  });
}

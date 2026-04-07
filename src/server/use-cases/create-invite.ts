import { randomUUID } from "crypto";
import type { OrgContext } from "@/server/org/require-org-context";
import {
  findActivePendingInvite,
  countPendingInvites,
  createInvite as repoCreateInvite,
} from "@/server/repo/invite-repo";
import { countMembers } from "@/server/repo/membership-repo";
import { InviteDuplicateError } from "@/server/errors/team-errors";
import { logAudit } from "@/server/audit/log-audit";
import { getPlanLimits, PlanLimitReachedError } from "@/billing/plan-limits";

interface CreateInviteResult {
  inviteId: string;
  token: string;
  inviteLink: string;
  expiresAt: Date;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cria um convite para a organização.
 *
 * Pré-condição: chamador já verificou permissão "member:invite" via assertPermission.
 *
 * @throws InviteDuplicateError se já existir convite PENDING não expirado para o email.
 */
export async function createInvite(
  ctx: OrgContext,
  email: string
): Promise<CreateInviteResult> {
  const existing = await findActivePendingInvite(ctx.orgId, email);
  if (existing) {
    throw new InviteDuplicateError();
  }

  // Enforça limite de membros (membros ativos + convites pendentes = "assentos")
  const [memberCount, pendingCount] = await Promise.all([
    countMembers(ctx.orgId),
    countPendingInvites(ctx.orgId),
  ]);
  const limits = getPlanLimits(ctx.plan);
  const currentSeats = memberCount + pendingCount;
  if (currentSeats >= limits.maxMembers) {
    throw new PlanLimitReachedError({
      resource: "members",
      limit: limits.maxMembers,
      current: currentSeats,
      plan: ctx.plan,
    });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

  const invite = await repoCreateInvite({
    orgId: ctx.orgId,
    email,
    token,
    expiresAt,
  });

  // TODO: enviar email para ${email} com o link do convite (Etapa futura)

  void logAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "invite.created",
    metadata: { inviteeEmail: email },
  });

  return {
    inviteId: invite.id,
    token,
    inviteLink: `/invite/${token}`,
    expiresAt,
  };
}

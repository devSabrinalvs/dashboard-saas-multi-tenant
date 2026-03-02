import {
  findMembershipById,
  deleteMembership,
} from "@/server/repo/membership-repo";
import { lastOwnerGuard } from "@/server/use-cases/_guards/last-owner-guard";
import { MemberNotFoundError } from "@/server/errors/team-errors";
import type { OrgContext } from "@/server/org/require-org-context";

interface RemoveMemberInput {
  orgId: string;
  actorCtx: OrgContext;
  targetMemberId: string;
}

/**
 * Remove um membro da organização.
 *
 * Pré-condição: chamador já verificou permissão "member:remove" via assertPermission.
 *
 * @throws MemberNotFoundError se o membro não existir ou for de outra org.
 * @throws LastOwnerError se tentar remover o único OWNER.
 */
export async function removeMember({
  orgId,
  targetMemberId,
}: RemoveMemberInput): Promise<void> {
  const membership = await findMembershipById(targetMemberId);

  if (!membership || membership.orgId !== orgId) {
    throw new MemberNotFoundError();
  }

  // Se o membro a ser removido é OWNER, verificar se é o último
  if (membership.role === "OWNER") {
    await lastOwnerGuard(orgId);
  }

  await deleteMembership(targetMemberId);

  // TODO(Etapa 8 - Audit): log("member.removed", { orgId, actorId: actorCtx.userId, targetMemberId, targetRole: membership.role })
}

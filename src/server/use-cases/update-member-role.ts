import {
  findMembershipById,
  updateMembershipRole,
} from "@/server/repo/membership-repo";
import { lastOwnerGuard } from "@/server/use-cases/_guards/last-owner-guard";
import {
  MemberNotFoundError,
  AdminCannotPromoteError,
} from "@/server/errors/team-errors";
import type { OrgContext } from "@/server/org/require-org-context";
import type { Role } from "@/generated/prisma/enums";

interface UpdateMemberRoleInput {
  orgId: string;
  actorCtx: OrgContext;
  targetMemberId: string;
  newRole: Role;
}

/**
 * Atualiza o role de um membro da organização.
 *
 * Pré-condição: chamador já verificou permissão "member:role:update" via assertPermission.
 *
 * @throws MemberNotFoundError se o membro não existir ou for de outra org.
 * @throws AdminCannotPromoteError se um ADMIN tentar promover para OWNER.
 * @throws LastOwnerError se tentar rebaixar o único OWNER.
 */
export async function updateMemberRole({
  orgId,
  actorCtx,
  targetMemberId,
  newRole,
}: UpdateMemberRoleInput): Promise<void> {
  const membership = await findMembershipById(targetMemberId);

  if (!membership || membership.orgId !== orgId) {
    throw new MemberNotFoundError();
  }

  // ADMIN não pode promover membros para OWNER
  if (actorCtx.role === "ADMIN" && newRole === "OWNER") {
    throw new AdminCannotPromoteError();
  }

  // Se o membro atual é OWNER e está sendo rebaixado, verificar se é o último
  if (membership.role === "OWNER" && newRole !== "OWNER") {
    await lastOwnerGuard(orgId);
  }

  await updateMembershipRole(targetMemberId, newRole);

  // TODO(Etapa 8 - Audit): log("member.role.updated", { orgId, actorId: actorCtx.userId, targetMemberId, oldRole: membership.role, newRole })
}

import {
  findInviteById,
  revokeInvite as repoRevokeInvite,
} from "@/server/repo/invite-repo";
import { InviteNotFoundError } from "@/server/errors/team-errors";

interface RevokeInviteInput {
  orgId: string;
  inviteId: string;
}

/**
 * Revoga um convite PENDING.
 *
 * Pré-condição: chamador já verificou permissão "member:invite" via assertPermission.
 *
 * @throws InviteNotFoundError se o convite não existir, pertencer a outra org ou não for PENDING.
 */
export async function revokeInvite({
  orgId,
  inviteId,
}: RevokeInviteInput): Promise<void> {
  const invite = await findInviteById(inviteId, orgId);

  if (!invite) {
    throw new InviteNotFoundError();
  }

  if (invite.status !== "PENDING") {
    throw new InviteNotFoundError();
  }

  await repoRevokeInvite(inviteId);

  // TODO(Etapa 8 - Audit): log("invite.revoked", { orgId, inviteId, revokedBy: actorUserId })
}

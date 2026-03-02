import { randomUUID } from "crypto";
import type { OrgContext } from "@/server/org/require-org-context";
import {
  findActivePendingInvite,
  createInvite as repoCreateInvite,
} from "@/server/repo/invite-repo";
import { InviteDuplicateError } from "@/server/errors/team-errors";

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

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

  const invite = await repoCreateInvite({
    orgId: ctx.orgId,
    email,
    token,
    expiresAt,
  });

  // TODO: enviar email para ${email} com o link do convite (Etapa futura)

  // TODO(Etapa 8 - Audit): log("member.invited", { orgId: ctx.orgId, invitedBy: ctx.userId, inviteeEmail: email })

  return {
    inviteId: invite.id,
    token,
    inviteLink: `/invite/${token}`,
    expiresAt,
  };
}

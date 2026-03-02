import { prisma } from "@/lib/prisma";
import {
  findInviteByToken,
  markInviteAccepted,
} from "@/server/repo/invite-repo";
import {
  findMembership,
  createMembership,
} from "@/server/repo/membership-repo";
import { findOrgBySlug } from "@/server/repo/organization-repo";
import {
  InviteNotFoundError,
  InviteExpiredError,
  InviteEmailMismatchError,
} from "@/server/errors/team-errors";
import { Role } from "@/generated/prisma/enums";

interface AcceptInviteInput {
  token: string;
  userId: string;
  userEmail: string;
}

interface AcceptInviteResult {
  orgSlug: string;
  orgName: string;
}

/**
 * Aceita um convite e cria o membership do usuário na organização.
 *
 * Idempotente: chamar duas vezes com o mesmo token retorna o mesmo resultado
 * sem erros e sem duplicar o membership.
 *
 * @throws InviteNotFoundError se token inválido ou convite revogado.
 * @throws InviteExpiredError se o convite expirou.
 * @throws InviteEmailMismatchError se o email do usuário diferir do email do convite.
 */
export async function acceptInvite({
  token,
  userId,
  userEmail,
}: AcceptInviteInput): Promise<AcceptInviteResult> {
  const invite = await findInviteByToken(token);

  if (!invite) {
    throw new InviteNotFoundError();
  }

  if (invite.expiresAt < new Date()) {
    throw new InviteExpiredError();
  }

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new InviteEmailMismatchError();
  }

  if (invite.status === "REVOKED") {
    throw new InviteNotFoundError();
  }

  const { orgSlug, orgName } = {
    orgSlug: invite.organization.slug,
    orgName: invite.organization.name,
  };

  // Path idempotente: convite já foi aceito — retorna dados da org sem erro
  if (invite.status === "ACCEPTED") {
    return { orgSlug, orgName };
  }

  // Buscar orgId via slug (já temos no invite.organization)
  const org = await findOrgBySlug(orgSlug);
  if (!org) throw new InviteNotFoundError();

  // Transação: marcar convite como ACCEPTED + criar membership (se não existir)
  await prisma.$transaction(async () => {
    await markInviteAccepted(invite.id);

    const existing = await findMembership(userId, org.id);
    if (!existing) {
      await createMembership(userId, org.id, Role.MEMBER);
    }
  });

  // TODO(Etapa 8 - Audit): log("member.joined", { orgId: org.id, userId, inviteId: invite.id })

  return { orgSlug, orgName };
}

import { prisma } from "@/lib/prisma";
import type { Invite } from "@/generated/prisma/client";
import { InviteStatus } from "@/generated/prisma/enums";

type InviteWithOrg = Invite & {
  organization: { name: string; slug: string };
};

/**
 * Cria um novo registro de convite.
 */
export async function createInvite(data: {
  orgId: string;
  email: string;
  token: string;
  expiresAt: Date;
}): Promise<Invite> {
  return prisma.invite.create({ data });
}

/**
 * Busca convite PENDING não expirado para o par (orgId, email).
 * Usado para detectar duplicatas antes de criar novo convite.
 */
export async function findActivePendingInvite(
  orgId: string,
  email: string
): Promise<Invite | null> {
  return prisma.invite.findFirst({
    where: {
      orgId,
      email,
      status: InviteStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
  });
}

/**
 * Busca convite pelo token único, incluindo dados básicos da org.
 * Retorna null se não encontrado.
 */
export async function findInviteByToken(
  token: string
): Promise<InviteWithOrg | null> {
  return prisma.invite.findUnique({
    where: { token },
    include: { organization: { select: { name: true, slug: true } } },
  });
}

/**
 * Busca convite pelo id, garantindo que pertence à org informada.
 * Retorna null se não encontrado ou se pertencer a outra org (cross-tenant).
 */
export async function findInviteById(
  inviteId: string,
  orgId: string
): Promise<Invite | null> {
  return prisma.invite.findFirst({
    where: { id: inviteId, orgId },
  });
}

/**
 * Marca convite como REVOKED.
 */
export async function revokeInvite(inviteId: string): Promise<Invite> {
  return prisma.invite.update({
    where: { id: inviteId },
    data: { status: InviteStatus.REVOKED },
  });
}

/**
 * Marca convite como ACCEPTED e registra data de aceitação.
 */
export async function markInviteAccepted(inviteId: string): Promise<Invite> {
  return prisma.invite.update({
    where: { id: inviteId },
    data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date() },
  });
}

/**
 * Conta convites PENDING não expirados de uma org.
 * Usado para calcular "assentos reservados" no enforcement de plano.
 */
export async function countPendingInvites(orgId: string): Promise<number> {
  return prisma.invite.count({
    where: { orgId, status: InviteStatus.PENDING, expiresAt: { gt: new Date() } },
  });
}

/**
 * Lista todos os convites de uma org, do mais recente ao mais antigo.
 */
export async function listInvites(orgId: string): Promise<Invite[]> {
  return prisma.invite.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
}

import { prisma } from "@/lib/prisma";
import type { Membership } from "@/generated/prisma/client";
import { type Role } from "@/generated/prisma/enums";

type MembershipWithUser = Membership & {
  user: { id: string; name: string | null; email: string };
};

/**
 * Cria um vínculo entre usuário e organização com o papel informado.
 */
export async function createMembership(
  userId: string,
  orgId: string,
  role: Role
): Promise<Membership> {
  return prisma.membership.create({ data: { userId, orgId, role } });
}

/**
 * Busca o vínculo entre um usuário e uma organização.
 * Retorna null se o usuário não for membro.
 */
export async function findMembership(
  userId: string,
  orgId: string
): Promise<Membership | null> {
  return prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
}

/**
 * Busca membership pelo seu id primário.
 * Retorna null se não encontrado.
 */
export async function findMembershipById(
  membershipId: string
): Promise<Membership | null> {
  return prisma.membership.findUnique({ where: { id: membershipId } });
}

/**
 * Lista todos os membros de uma org com dados básicos do usuário,
 * ordenados pela data de entrada (mais antigo primeiro).
 *
 * Usa $queryRaw para contornar limitação do adapter PrismaPg (Prisma 7)
 * onde findMany com include pode falhar — mesmo padrão de findOrgsByUserId.
 */
export async function listMemberships(
  orgId: string
): Promise<MembershipWithUser[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      role: string;
      userId: string;
      orgId: string;
      createdAt: Date;
      userId2: string;
      userName: string | null;
      userEmail: string;
    }>
  >`
    SELECT
      m.id,
      m.role,
      m."userId",
      m."orgId",
      m."createdAt",
      u.id   AS "userId2",
      u.name AS "userName",
      u.email AS "userEmail"
    FROM "Membership" m
    INNER JOIN "User" u ON u.id = m."userId"
    WHERE m."orgId" = ${orgId}
    ORDER BY m."createdAt" ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    role: r.role as Role,
    userId: r.userId,
    orgId: r.orgId,
    createdAt: r.createdAt,
    user: {
      id: r.userId2,
      name: r.userName,
      email: r.userEmail,
    },
  }));
}

/**
 * Atualiza o role de uma membership.
 */
export async function updateMembershipRole(
  membershipId: string,
  role: Role
): Promise<Membership> {
  return prisma.membership.update({
    where: { id: membershipId },
    data: { role },
  });
}

/**
 * Remove uma membership pelo id.
 */
export async function deleteMembership(
  membershipId: string
): Promise<Membership> {
  return prisma.membership.delete({ where: { id: membershipId } });
}

/**
 * Conta quantos membros com role OWNER a org possui.
 */
export async function countOwners(orgId: string): Promise<number> {
  return prisma.membership.count({ where: { orgId, role: "OWNER" } });
}

/**
 * Conta todos os membros ativos de uma org.
 */
export async function countMembers(orgId: string): Promise<number> {
  return prisma.membership.count({ where: { orgId } });
}

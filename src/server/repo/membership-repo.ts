import { prisma } from "@/lib/prisma";
import type { Membership } from "@/generated/prisma/client";
import { type Role } from "@/generated/prisma/enums";

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

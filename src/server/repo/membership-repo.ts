import { prisma } from "@/lib/prisma";
import type { Membership } from "@/generated/prisma/client";

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

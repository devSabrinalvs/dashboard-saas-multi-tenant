import { prisma } from "@/lib/prisma";
import type { Organization } from "@/generated/prisma/client";

/**
 * Busca uma organização pelo slug.
 * Retorna null se não existir.
 */
export async function findOrgBySlug(
  slug: string
): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { slug } });
}

/**
 * Retorna todas as organizações das quais o usuário é membro,
 * ordenadas pela data de criação da org (mais antiga primeiro).
 */
export async function findOrgsByUserId(
  userId: string
): Promise<Organization[]> {
  return prisma.organization.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: { createdAt: "asc" },
  });
}

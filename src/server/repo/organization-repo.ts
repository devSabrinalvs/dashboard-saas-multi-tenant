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
 * ordenadas pela data de entrada (mais antiga primeiro).
 *
 * Usa $queryRaw para contornar limitação do adapter PrismaPg (Prisma 7)
 * onde findMany falha — findUnique funciona, mas findMany não.
 */
export async function findOrgsByUserId(
  userId: string
): Promise<Organization[]> {
  return prisma.$queryRaw<Organization[]>`
    SELECT o.id, o.name, o.slug, o."createdAt", o."updatedAt"
    FROM "Organization" o
    INNER JOIN "Membership" m ON m."orgId" = o.id
    WHERE m."userId" = ${userId}
    ORDER BY m."createdAt" ASC
  `;
}

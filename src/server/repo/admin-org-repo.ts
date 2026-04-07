/**
 * Repositório de organizações para o Admin Console interno.
 *
 * Usa $queryRaw para buscas (findMany não funciona com PrismaPg).
 */

import { prisma } from "@/lib/prisma";
import type { Plan, SubscriptionStatus } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface AdminOrgRow {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  memberCount: number;
  projectCount: number;
}

export interface AdminOrgMember {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: Date;
}

export interface AdminOrgDetail extends AdminOrgRow {
  members: AdminOrgMember[];
  taskCount: number;
  billingEmail: string | null;
  stripeCustomerId: string | null;
  graceUntil: Date | null;
  currentPeriodEnd: Date | null;
}

// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

/**
 * Busca organizações por slug ou nome (case-insensitive, parcial).
 * Retorna no máximo 50 resultados ordenados por createdAt DESC.
 */
export async function searchAdminOrgs(search: string): Promise<AdminOrgRow[]> {
  const pattern = `%${search.toLowerCase()}%`;
  return prisma.$queryRaw<
    (Omit<AdminOrgRow, "memberCount" | "projectCount"> & {
      memberCount: bigint;
      projectCount: bigint;
    })[]
  >`
    SELECT
      o.id,
      o.name,
      o.slug,
      o.plan,
      o."subscriptionStatus",
      o."cancelAtPeriodEnd",
      o."createdAt",
      (SELECT COUNT(*) FROM "Membership" m WHERE m."orgId" = o.id) AS "memberCount",
      (SELECT COUNT(*) FROM "Project" p WHERE p."orgId" = o.id) AS "projectCount"
    FROM "Organization" o
    WHERE LOWER(o.slug) LIKE ${pattern}
       OR LOWER(o.name) LIKE ${pattern}
    ORDER BY o."createdAt" DESC
    LIMIT 50
  `.then((rows) =>
    rows.map((r) => ({
      ...r,
      memberCount: Number(r.memberCount),
      projectCount: Number(r.projectCount),
    }))
  );
}

/**
 * Retorna detalhes completos de uma organização por ID, incluindo membros.
 */
export async function findAdminOrgById(
  orgId: string
): Promise<AdminOrgDetail | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      subscriptionStatus: true,
      cancelAtPeriodEnd: true,
      createdAt: true,
      billingEmail: true,
      stripeCustomerId: true,
      graceUntil: true,
      currentPeriodEnd: true,
    },
  });

  if (!org) return null;

  const [members, counts] = await Promise.all([
    prisma.$queryRaw<AdminOrgMember[]>`
      SELECT
        m."userId",
        u.email,
        u.name,
        m.role,
        m."createdAt" AS "joinedAt"
      FROM "Membership" m
      JOIN "User" u ON u.id = m."userId"
      WHERE m."orgId" = ${orgId}
      ORDER BY m."createdAt" ASC
    `,
    prisma.$queryRaw<{ memberCount: bigint; projectCount: bigint; taskCount: bigint }[]>`
      SELECT
        (SELECT COUNT(*) FROM "Membership" WHERE "orgId" = ${orgId}) AS "memberCount",
        (SELECT COUNT(*) FROM "Project" WHERE "orgId" = ${orgId}) AS "projectCount",
        (SELECT COUNT(*) FROM "Task" WHERE "orgId" = ${orgId}) AS "taskCount"
    `,
  ]);

  const c = counts[0];
  return {
    ...org,
    subscriptionStatus: org.subscriptionStatus ?? null,
    memberCount: Number(c.memberCount),
    projectCount: Number(c.projectCount),
    taskCount: Number(c.taskCount),
    members,
  };
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

/** Força o plano de uma organização (override administrativo). */
export async function adminForceOrgPlan(
  orgId: string,
  plan: Plan
): Promise<void> {
  await prisma.organization.update({
    where: { id: orgId },
    data: { plan, planUpdatedAt: new Date() },
  });
}

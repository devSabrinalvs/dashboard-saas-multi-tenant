/**
 * Repositório de AdminAuditLog — append-only.
 * Nunca deleta registros.
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface AdminAuditEntry {
  id: string;
  actorAdminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateAdminAuditParams {
  actorAdminEmail: string;
  action: string;
  targetType: "user" | "org";
  targetId: string;
  metadata?: Record<string, string | number | boolean | null>;
}

// ---------------------------------------------------------------------------
// Criar
// ---------------------------------------------------------------------------

export async function createAdminAuditLog(
  params: CreateAdminAuditParams
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      actorAdminEmail: params.actorAdminEmail,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: (params.metadata ?? {}) as Record<string, string | number | boolean | null>,
    },
  });
}

// ---------------------------------------------------------------------------
// Listar — usa $queryRaw por limitação do PrismaPg
// ---------------------------------------------------------------------------

export interface ListAdminAuditParams {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
}

export interface AdminAuditPage {
  entries: AdminAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAdminAuditLogs(
  params: ListAdminAuditParams = {}
): Promise<AdminAuditPage> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const search = params.search ?? "";
  const action = params.action ?? "";

  const searchPattern = `%${search.toLowerCase()}%`;
  const actionPattern = action ? action : "%";

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<AdminAuditEntry[]>`
      SELECT
        id,
        "actorAdminEmail",
        action,
        "targetType",
        "targetId",
        metadata,
        "createdAt"
      FROM "AdminAuditLog"
      WHERE (${search} = '' OR LOWER("actorAdminEmail") LIKE ${searchPattern}
                            OR LOWER("targetId") LIKE ${searchPattern})
        AND action LIKE ${actionPattern}
      ORDER BY "createdAt" DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `,
    prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total
      FROM "AdminAuditLog"
      WHERE (${search} = '' OR LOWER("actorAdminEmail") LIKE ${searchPattern}
                            OR LOWER("targetId") LIKE ${searchPattern})
        AND action LIKE ${actionPattern}
    `,
  ]);

  return {
    entries: rows,
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

import { prisma } from "@/lib/prisma";
import type { PaginatedResult } from "./project-repo";

export type AuditLogItem = {
  id: string;
  action: string;
  createdAt: Date;
  metadata: unknown;
  actor: { id: string; email: string } | null;
};

export type AuditLogFilters = {
  orgId: string;
  action?: string;
  search?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
};

/**
 * Lista audit logs de uma organização com filtros e paginação.
 * Ordenação: createdAt DESC.
 */
export async function listAuditLogs(
  params: AuditLogFilters
): Promise<PaginatedResult<AuditLogItem>> {
  const { orgId, action, search, actorId, from, to, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    orgId,
    ...(action ? { action } : {}),
    ...(search
      ? { action: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(actorId ? { actorUserId: actorId } : {}),
    ...((from ?? to)
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        actor: {
          select: { id: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt,
      metadata: log.metadata,
      actor: log.actor,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

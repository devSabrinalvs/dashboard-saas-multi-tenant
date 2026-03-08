import type { OrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { listAuditLogs as repoListAuditLogs, type AuditLogItem } from "@/server/repo/audit-repo";
import type { PaginatedResult } from "@/server/repo/project-repo";
import type { AuditQueryInput } from "@/schemas/audit";

/**
 * Lista audit logs da organização.
 *
 * @throws PermissionDeniedError se o role não tiver "audit:read" (MEMBER, VIEWER).
 */
export async function listAuditLogs(
  ctx: OrgContext,
  params: AuditQueryInput
): Promise<PaginatedResult<AuditLogItem>> {
  assertPermission(ctx, "audit:read");

  return repoListAuditLogs({
    orgId: ctx.orgId,
    action: params.action,
    search: params.search,
    actorId: params.actorId,
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to) : undefined,
    page: params.page,
    pageSize: params.pageSize,
  });
}

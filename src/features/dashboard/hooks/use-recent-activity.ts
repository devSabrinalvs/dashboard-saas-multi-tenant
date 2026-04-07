import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { PaginatedResult } from "@/server/repo/project-repo";
import type { AuditLogItem } from "@/server/repo/audit-repo";

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

/**
 * Busca os últimos 10 audit logs da última semana.
 * Só deve ser chamado quando `canAudit === true`; use `enabled` para isso.
 */
export function useRecentActivity(orgSlug: string, enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", "recent-activity", orgSlug],
    queryFn: () =>
      apiClient.get<PaginatedResult<AuditLogItem>>(
        `/api/org/${orgSlug}/audit`,
        { from: sevenDaysAgo(), page: "1", pageSize: "10" }
      ),
    enabled,
  });
}

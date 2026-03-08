import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { AuditQueryInput } from "@/schemas/audit";
import type { AuditLogItem } from "@/server/repo/audit-repo";
import type { PaginatedResult } from "@/server/repo/project-repo";

export function useAuditLogs(
  orgSlug: string,
  params: Partial<AuditQueryInput>
) {
  return useQuery({
    queryKey: ["audit", orgSlug, params],
    queryFn: () =>
      apiClient.get<PaginatedResult<AuditLogItem>>(
        `/api/org/${orgSlug}/audit`,
        params as Record<string, unknown>
      ),
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export interface OrgTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export function useOrgTags(orgSlug: string) {
  return useQuery({
    queryKey: ["org-tags", orgSlug],
    queryFn: () => apiClient.get<{ tags: OrgTag[] }>(`/api/org/${orgSlug}/tags`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOrgTag(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      apiClient.post<{ tag: OrgTag }>(`/api/org/${orgSlug}/tags`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-tags", orgSlug] }),
  });
}

export function useDeleteOrgTag(orgSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) =>
      apiClient.delete<{ ok: boolean }>(`/api/org/${orgSlug}/tags/${tagId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-tags", orgSlug] }),
  });
}

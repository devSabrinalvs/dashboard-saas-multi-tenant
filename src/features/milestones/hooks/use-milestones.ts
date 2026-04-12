"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export interface Milestone {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  taskCount: number;
}

function milestoneKey(orgSlug: string, projectId: string) {
  return ["milestones", orgSlug, projectId];
}

export function useMilestones(orgSlug: string, projectId: string) {
  return useQuery({
    queryKey: milestoneKey(orgSlug, projectId),
    queryFn: () =>
      apiClient.get<{ milestones: Milestone[] }>(
        `/api/org/${orgSlug}/projects/${projectId}/milestones`
      ),
    staleTime: 60_000,
  });
}

export function useCreateMilestone(orgSlug: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; startDate?: string | null; dueDate?: string | null }) =>
      apiClient.post<{ milestone: Milestone }>(
        `/api/org/${orgSlug}/projects/${projectId}/milestones`,
        data
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(orgSlug, projectId) }),
  });
}

export function useUpdateMilestone(orgSlug: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: { status?: "OPEN" | "CLOSED"; name?: string } }) =>
      apiClient.patch<{ milestone: Milestone }>(
        `/api/org/${orgSlug}/projects/${projectId}/milestones/${milestoneId}`,
        data
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(orgSlug, projectId) }),
  });
}

export function useDeleteMilestone(orgSlug: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) =>
      apiClient.delete<{ ok: boolean }>(
        `/api/org/${orgSlug}/projects/${projectId}/milestones/${milestoneId}`
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(orgSlug, projectId) }),
  });
}

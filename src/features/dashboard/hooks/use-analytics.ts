"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TasksByWeekItem {
  week: string;
  criadas: number;
  concluidas: number;
}

export interface TasksByMemberItem {
  membro: string;
  tarefas: number;
  concluidas: number;
}

export interface TasksByPriorityItem {
  prioridade: string;
  total: number;
  fill: string;
}

export interface AnalyticsData {
  tasksByWeek: TasksByWeekItem[];
  tasksByMember: TasksByMemberItem[];
  tasksByPriority: TasksByPriorityItem[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalytics(orgSlug: string) {
  return useQuery({
    queryKey: ["analytics", orgSlug],
    queryFn: () =>
      apiClient.get<AnalyticsData>(`/api/org/${orgSlug}/analytics`),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

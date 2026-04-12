"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export interface SearchTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  projectName: string;
}

export interface SearchProject {
  id: string;
  name: string;
  description: string | null;
}

export interface SearchResults {
  tasks: SearchTask[];
  projects: SearchProject[];
}

export function useGlobalSearch(orgSlug: string, query: string) {
  return useQuery<SearchResults>({
    queryKey: ["global-search", orgSlug, query],
    queryFn: () =>
      apiClient.get<SearchResults>(`/api/org/${orgSlug}/search`, { q: query }),
    enabled: query.length >= 2,
    staleTime: 0,
  });
}

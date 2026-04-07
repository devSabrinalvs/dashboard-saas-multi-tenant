import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { Role } from "@/generated/prisma/enums";

export type OrgMember = {
  id: string;
  role: Role;
  userId: string;
  orgId: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

/**
 * Lista membros de uma organização.
 * Usado pelo seletor de responsável (assignee).
 * Dados são estáveis — staleTime de 5 minutos.
 */
export function useOrgMembers(orgSlug: string) {
  return useQuery({
    queryKey: ["org-members", orgSlug],
    queryFn: () =>
      apiClient
        .get<{ members: OrgMember[] }>(`/api/org/${orgSlug}/members`)
        .then((res) => res.members),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

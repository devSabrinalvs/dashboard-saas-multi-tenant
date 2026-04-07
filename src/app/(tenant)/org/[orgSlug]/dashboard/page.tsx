import { requireOrgContext } from "@/server/org/require-org-context";
import { listMemberships } from "@/server/repo/membership-repo";
import { can } from "@/security/rbac";
import { DashboardClient } from "@/features/dashboard/components/dashboard-client";

/**
 * Dashboard page — Server Component.
 *
 * Responsabilidades SSR:
 *  - Autenticação e contexto de org (requireOrgContext)
 *  - Members count (chamada SSR, evita waterfall no client)
 *  - Cálculo de permissões via RBAC
 *
 * O restante dos dados (projects total, tasks, audit) é buscado
 * pelo DashboardClient usando TanStack Query com skeleton por seção.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  // Members count via SSR — evita request extra no client
  const members = await listMemberships(ctx.orgId);

  const canAudit = can(ctx.role, "audit:read");
  const canCreateProject = can(ctx.role, "project:create");
  const canCreateTask = can(ctx.role, "task:create");
  const canInvite = can(ctx.role, "member:invite");

  return (
    <DashboardClient
      orgSlug={ctx.orgSlug}
      orgName={ctx.orgName}
      role={ctx.role}
      membersCount={members.length}
      canAudit={canAudit}
      canCreateProject={canCreateProject}
      canCreateTask={canCreateTask}
      canInvite={canInvite}
    />
  );
}

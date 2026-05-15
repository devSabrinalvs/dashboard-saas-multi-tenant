import { requireOrgContext } from "@/server/org/require-org-context";
import { can } from "@/security/rbac";
import { ProjectsClient } from "@/features/projects/components/projects-client";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const canCreate = can(ctx.role, "project:create");
  const canUpdate = can(ctx.role, "project:update");
  const canDelete = can(ctx.role, "project:delete");

  return (
    <ProjectsClient
      orgSlug={orgSlug}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}

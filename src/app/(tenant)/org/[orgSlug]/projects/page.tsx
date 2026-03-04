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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Projetos</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os projetos de{" "}
          <span className="font-medium text-foreground">{ctx.orgName}</span>.
        </p>
      </div>

      <ProjectsClient
        orgSlug={orgSlug}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}

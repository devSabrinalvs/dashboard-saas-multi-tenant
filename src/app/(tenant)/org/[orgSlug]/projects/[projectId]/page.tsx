import { notFound } from "next/navigation";
import { requireOrgContext } from "@/server/org/require-org-context";
import { can } from "@/security/rbac";
import { getProject } from "@/server/use-cases/get-project";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
import { TasksSection } from "@/features/tasks/components/tasks-section";
import { Badge } from "@/components/ui/badge";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
}) {
  const { orgSlug, projectId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  let project;
  try {
    project = await getProject(ctx, projectId);
  } catch (err) {
    if (err instanceof ProjectNotFoundError) notFound();
    throw err;
  }

  const canUpdateProject = can(ctx.role, "project:update");
  const canDeleteProject = can(ctx.role, "project:delete");
  const canCreateTask = can(ctx.role, "task:create");
  const canUpdateTask = can(ctx.role, "task:update");
  const canDeleteTask = can(ctx.role, "task:delete");

  return (
    <div className="space-y-8">
      {/* Project header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {(canUpdateProject || canDeleteProject) && (
            <Badge variant="outline" className="text-xs">
              {ctx.role.toLowerCase()}
            </Badge>
          )}
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Criado em{" "}
          {new Date(project.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Tasks */}
      <TasksSection
        orgSlug={orgSlug}
        projectId={projectId}
        canCreate={canCreateTask}
        canUpdate={canUpdateTask}
        canDelete={canDeleteTask}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgContext } from "@/server/org/require-org-context";
import { can } from "@/security/rbac";
import { getProject } from "@/server/use-cases/get-project";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
import { TasksSection } from "@/features/tasks/components/tasks-section";
import { PageHeader } from "@/components/shared/page-header";
import { ChevronLeft } from "lucide-react";

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

  const canCreateTask = can(ctx.role, "task:create");
  const canUpdateTask = can(ctx.role, "task:update");
  const canDeleteTask = can(ctx.role, "task:delete");

  const createdLabel = new Date(project.createdAt).toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/org/${orgSlug}/projects`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        Projetos
      </Link>

      {/* Project header */}
      <PageHeader
        title={project.name}
        subtitle={
          project.description
            ? `${project.description} · Criado em ${createdLabel}`
            : `Criado em ${createdLabel}`
        }
      />

      {/* Tasks */}
      <TasksSection
        orgSlug={orgSlug}
        projectId={projectId}
        canCreate={canCreateTask}
        canUpdate={canUpdateTask}
        canDelete={canDeleteTask}
        currentUserId={ctx.userId}
      />
    </div>
  );
}

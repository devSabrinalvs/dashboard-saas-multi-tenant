import { redirect } from "next/navigation";
import { resolveOrgContext } from "@/shared/security";
import { projectRepo } from "@/features/projects/repo";
import { taskRepo } from "@/features/tasks/repo";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { CreateTaskForm } from "@/features/tasks/components/create-task-form";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
}) {
  const { orgSlug, projectId } = await params;
  const context = await resolveOrgContext(orgSlug);

  const project = await projectRepo.findById(projectId, context.orgId);
  if (!project) redirect(`/org/${orgSlug}/projects`);

  const tasks = await taskRepo.listByProject(projectId, context.orgId);

  const statusColors: Record<string, "default" | "secondary" | "outline"> = {
    TODO: "outline",
    IN_PROGRESS: "secondary",
    DONE: "default",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}
      </div>

      <CreateTaskForm orgSlug={orgSlug} projectId={projectId} />

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tasks yet. Create one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span>{task.title}</span>
                  <Badge variant={statusColors[task.status] ?? "outline"}>
                    {task.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

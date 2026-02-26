import { resolveOrgContext } from "@/shared/security";
import { projectRepo } from "@/features/projects/repo";
import { prisma } from "@/shared/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/ui/card";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const context = await resolveOrgContext(orgSlug);

  const [projects, memberCount, taskCount] = await Promise.all([
    projectRepo.listByOrg(context.orgId),
    prisma.membership.count({ where: { orgId: context.orgId } }),
    prisma.task.count({ where: { orgId: context.orgId } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{memberCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{taskCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet. Create one to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {projects.slice(0, 5).map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="font-medium">{project.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {project._count.tasks} tasks
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

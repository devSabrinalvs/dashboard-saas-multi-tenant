import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { createProject } from "@/server/use-cases/create-project";
import { createTask } from "@/server/use-cases/create-task";
import { z } from "zod";

const applySchema = z.object({
  projectName: z.string().min(1).max(120),
  projectDescription: z.string().max(500).optional(),
});

/**
 * POST /api/org/[orgSlug]/templates/[templateId]/apply
 *
 * Cria um novo projeto a partir do template, com as tasks pré-definidas.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; templateId: string }> }
) {
  const { orgSlug, templateId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "project:create");

  const template = await prisma.projectTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ isSystem: true }, { orgId: ctx.orgId }],
    },
  });
  if (!template) return NextResponse.json({ error: "Template não encontrado." }, { status: 404 });

  const body = await req.json();
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 422 });
  }

  // Create project
  const project = await createProject(ctx, {
    name: parsed.data.projectName,
    description: parsed.data.projectDescription,
  });

  // Create tasks from template
  const tasks = template.tasksJson as Array<{
    title: string;
    status?: string;
    priority?: string;
    tags?: string[];
  }>;

  await Promise.allSettled(
    tasks.map((t) =>
      createTask(ctx, project.id, {
        title: t.title,
        status: (t.status as "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED") ?? "TODO",
        priority: (t.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") ?? "MEDIUM",
        tags: t.tags ?? [],
      })
    )
  );

  return NextResponse.json({ project, tasksCreated: tasks.length }, { status: 201 });
}

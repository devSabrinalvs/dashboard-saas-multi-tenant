import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createMilestoneSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime({ offset: true }).nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
});

/**
 * GET  /api/org/[orgSlug]/projects/[projectId]/milestones
 * POST /api/org/[orgSlug]/projects/[projectId]/milestones
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string }> }
) {
  const { orgSlug, projectId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const project = await prisma.project.findFirst({ where: { id: projectId, orgId: ctx.orgId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

  const milestones = await prisma.$queryRaw<
    {
      id: string; name: string; description: string | null;
      startDate: Date | null; dueDate: Date | null;
      status: string; createdAt: Date; taskCount: bigint;
    }[]
  >`
    SELECT m.id, m.name, m.description, m."startDate", m."dueDate",
           m.status::text, m."createdAt",
           COUNT(t.id) AS "taskCount"
    FROM "Milestone" m
    LEFT JOIN "Task" t ON t."milestoneId" = m.id
    WHERE m."projectId" = ${projectId} AND m."orgId" = ${ctx.orgId}
    GROUP BY m.id
    ORDER BY m."createdAt" DESC
  `;

  return NextResponse.json({
    milestones: milestones.map((m) => ({ ...m, taskCount: Number(m.taskCount) })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string }> }
) {
  const { orgSlug, projectId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "project:update");

  const project = await prisma.project.findFirst({ where: { id: projectId, orgId: ctx.orgId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

  const body = await req.json();
  const parsed = createMilestoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 422 });
  }

  const milestone = await prisma.milestone.create({
    data: {
      orgId: ctx.orgId,
      projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
    select: { id: true, name: true, description: true, startDate: true, dueDate: true, status: true, createdAt: true },
  });

  return NextResponse.json({ milestone }, { status: 201 });
}

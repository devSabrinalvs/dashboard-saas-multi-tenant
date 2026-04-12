import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMilestoneSchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  description: z.string().max(500).nullable().optional(),
  startDate: z.string().datetime({ offset: true }).nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
});

/**
 * PATCH  /api/org/[orgSlug]/projects/[projectId]/milestones/[milestoneId]
 * DELETE /api/org/[orgSlug]/projects/[projectId]/milestones/[milestoneId]
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string; milestoneId: string }> }
) {
  const { orgSlug, projectId, milestoneId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "project:update");

  const ms = await prisma.milestone.findFirst({ where: { id: milestoneId, projectId, orgId: ctx.orgId } });
  if (!ms) return NextResponse.json({ error: "Milestone não encontrado." }, { status: 404 });

  const body = await req.json();
  const parsed = updateMilestoneSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });

  const { startDate, dueDate, ...rest } = parsed.data;
  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      ...rest,
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    },
    select: { id: true, name: true, description: true, startDate: true, dueDate: true, status: true },
  });

  return NextResponse.json({ milestone: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; projectId: string; milestoneId: string }> }
) {
  const { orgSlug, projectId, milestoneId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "project:delete");

  const ms = await prisma.milestone.findFirst({ where: { id: milestoneId, projectId, orgId: ctx.orgId } });
  if (!ms) return NextResponse.json({ error: "Milestone não encontrado." }, { status: 404 });

  await prisma.milestone.delete({ where: { id: milestoneId } });
  return NextResponse.json({ ok: true });
}

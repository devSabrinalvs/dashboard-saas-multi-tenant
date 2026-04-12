import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addEntrySchema = z.object({
  startedAt: z.string().datetime({ offset: true }),
  stoppedAt: z.string().datetime({ offset: true }).optional(),
  note: z.string().max(200).optional(),
});

/**
 * GET  /api/org/[orgSlug]/tasks/[taskId]/time  — Listar entradas de tempo
 * POST /api/org/[orgSlug]/tasks/[taskId]/time  — Adicionar entrada manual ou iniciar timer
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  const entries = await prisma.$queryRaw<
    {
      id: string; startedAt: Date; stoppedAt: Date | null;
      durationMinutes: number | null; note: string | null;
      userId: string; userName: string | null; userEmail: string;
    }[]
  >`
    SELECT te.id, te."startedAt", te."stoppedAt", te."durationMinutes", te.note,
           te."userId", u.name AS "userName", u.email AS "userEmail"
    FROM "TimeEntry" te
    JOIN "User" u ON u.id = te."userId"
    WHERE te."taskId" = ${taskId} AND te."orgId" = ${ctx.orgId}
    ORDER BY te."startedAt" DESC
    LIMIT 50
  `;

  const totalMinutes = entries.reduce((acc, e) => acc + (e.durationMinutes ?? 0), 0);

  return NextResponse.json({ entries, totalMinutes });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "task:update");

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  const body = await req.json();
  const parsed = addEntrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 422 });

  const startedAt = new Date(parsed.data.startedAt);
  const stoppedAt = parsed.data.stoppedAt ? new Date(parsed.data.stoppedAt) : null;
  const durationMinutes = stoppedAt
    ? Math.round((stoppedAt.getTime() - startedAt.getTime()) / 60_000)
    : null;

  const entry = await prisma.timeEntry.create({
    data: {
      taskId,
      orgId: ctx.orgId,
      userId: ctx.userId,
      startedAt,
      stoppedAt,
      durationMinutes,
      note: parsed.data.note,
    },
    select: { id: true, startedAt: true, stoppedAt: true, durationMinutes: true, note: true },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

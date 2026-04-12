/**
 * GET  /api/org/[orgSlug]/tasks/[taskId]/custom-values — valores dos campos customizados
 * POST /api/org/[orgSlug]/tasks/[taskId]/custom-values — upsert de um valor
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const upsertSchema = z.object({
  fieldDefId: z.string().min(1),
  value: z.string().max(500),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId } });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  const values = await prisma.$queryRaw<
    { id: string; fieldDefId: string; fieldName: string; fieldType: string; value: string }[]
  >`
    SELECT v.id, v."fieldDefId", d.name AS "fieldName", d.type AS "fieldType", v.value
    FROM "CustomFieldValue" v
    JOIN "CustomFieldDef" d ON d.id = v."fieldDefId"
    WHERE v."taskId" = ${taskId} AND v."orgId" = ${ctx.orgId}
    ORDER BY d.position ASC
  `;

  return NextResponse.json({ values });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; taskId: string }> }
) {
  const { orgSlug, taskId } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "task:update");

  const task = await prisma.task.findFirst({ where: { id: taskId, orgId: ctx.orgId } });
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
  }

  const { fieldDefId, value } = parsed.data;

  // Verifica que a definição pertence à org
  const def = await prisma.customFieldDef.findFirst({
    where: { id: fieldDefId, orgId: ctx.orgId },
  });
  if (!def) return NextResponse.json({ error: "Campo não encontrado." }, { status: 404 });

  // Upsert: se não tiver valor, cria; se tiver, atualiza
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "CustomFieldValue"
    WHERE "fieldDefId" = ${fieldDefId} AND "taskId" = ${taskId}
    LIMIT 1
  `;

  let result;
  if (existing.length > 0 && existing[0]) {
    await prisma.customFieldValue.updateMany({
      where: { id: existing[0].id },
      data: { value },
    });
    result = await prisma.customFieldValue.findFirst({ where: { id: existing[0].id } });
  } else {
    result = await prisma.customFieldValue.create({
      data: { fieldDefId, taskId, orgId: ctx.orgId, value },
    });
  }

  return NextResponse.json({ value: result }, { status: 200 });
}

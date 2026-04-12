import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const templateTaskSchema = z.object({
  title: z.string().min(1).max(160),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  tags: z.array(z.string()).default([]),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  tasks: z.array(templateTaskSchema).max(50),
});

/**
 * GET  /api/org/[orgSlug]/templates  — Lista templates do sistema + da org
 * POST /api/org/[orgSlug]/templates  — Cria template da org (OWNER/ADMIN)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const templates = await prisma.$queryRaw<
    { id: string; name: string; description: string | null; tasksJson: unknown; isSystem: boolean; orgId: string | null }[]
  >`
    SELECT id, name, description, "tasksJson", "isSystem", "orgId"
    FROM "ProjectTemplate"
    WHERE "isSystem" = true OR "orgId" = ${ctx.orgId}
    ORDER BY "isSystem" DESC, name ASC
  `;

  return NextResponse.json({ templates });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "project:create");

  const body = await req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 422 });
  }

  const template = await prisma.projectTemplate.create({
    data: {
      orgId: ctx.orgId,
      name: parsed.data.name,
      description: parsed.data.description,
      tasksJson: parsed.data.tasks,
    },
    select: { id: true, name: true, description: true, tasksJson: true, isSystem: true },
  });

  return NextResponse.json({ template }, { status: 201 });
}

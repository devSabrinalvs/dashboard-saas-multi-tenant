/**
 * GET  /api/org/[orgSlug]/custom-fields — lista definições de campos customizados
 * POST /api/org/[orgSlug]/custom-fields — cria nova definição
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "SELECT"] as const;

const createSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.enum(FIELD_TYPES),
  options: z.array(z.string().min(1).max(64)).max(20).default([]),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const fields = await prisma.$queryRaw<
    { id: string; name: string; type: string; options: string[]; position: number }[]
  >`
    SELECT id, name, type, options, position
    FROM "CustomFieldDef"
    WHERE "orgId" = ${ctx.orgId}
    ORDER BY position ASC, "createdAt" ASC
  `;

  return NextResponse.json({ fields });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "member:invite"); // ADMIN+

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
  }

  const field = await prisma.customFieldDef.create({
    data: {
      orgId: ctx.orgId,
      name: parsed.data.name,
      type: parsed.data.type,
      options: parsed.data.options,
    },
  });

  return NextResponse.json({ field }, { status: 201 });
}

import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTagSchema = z.object({
  name: z.string().min(1).max(32).trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve ser hex (#rrggbb)")
    .default("#6366f1"),
});

/**
 * GET  /api/org/[orgSlug]/tags  — Lista tags da org
 * POST /api/org/[orgSlug]/tags  — Cria nova tag (OWNER/ADMIN/MEMBER)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const tags = await prisma.$queryRaw<
    { id: string; name: string; color: string; createdAt: Date }[]
  >`
    SELECT id, name, color, "createdAt"
    FROM "OrgTag"
    WHERE "orgId" = ${ctx.orgId}
    ORDER BY name ASC
  `;

  return NextResponse.json({ tags });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "task:create"); // MEMBER+

  const body = await req.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 422 });
  }

  try {
    const tag = await prisma.orgTag.create({
      data: {
        orgId: ctx.orgId,
        name: parsed.data.name,
        color: parsed.data.color,
      },
      select: { id: true, name: true, color: true, createdAt: true },
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Tag já existe com este nome." }, { status: 409 });
  }
}

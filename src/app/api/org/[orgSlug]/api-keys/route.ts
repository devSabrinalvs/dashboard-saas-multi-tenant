/**
 * GET  /api/org/[orgSlug]/api-keys — lista API keys da org (sem o valor completo)
 * POST /api/org/[orgSlug]/api-keys — cria nova API key (retorna o valor raw uma única vez)
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/server/auth/token";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(64),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "billing:manage"); // OWNER only

  const keys = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      prefix: string;
      active: boolean;
      lastUsedAt: Date | null;
      expiresAt: Date | null;
      createdAt: Date;
    }[]
  >`
    SELECT id, name, prefix, active, "lastUsedAt", "expiresAt", "createdAt"
    FROM "ApiKey"
    WHERE "orgId" = ${ctx.orgId}
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json({ keys });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "billing:manage"); // OWNER only

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 422 });
  }

  const rawToken = generateToken();
  const keyHash = hashToken(rawToken);
  // prefix = "pk_" + first 8 hex chars (for display)
  const prefix = `pk_${rawToken.slice(0, 8)}`;
  // Full key shown to user once: prefix + rest
  const fullKey = `pk_${rawToken}`;

  const key = await prisma.apiKey.create({
    data: {
      orgId: ctx.orgId,
      name: parsed.data.name,
      keyHash,
      prefix,
      createdById: ctx.userId,
    },
  });

  return NextResponse.json({
    key: {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      active: key.active,
      createdAt: key.createdAt,
    },
    // Retornado UMA VEZ — não é armazenado
    fullKey,
  }, { status: 201 });
}

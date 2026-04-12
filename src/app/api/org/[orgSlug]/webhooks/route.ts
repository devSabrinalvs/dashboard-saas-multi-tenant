import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { z } from "zod";

const WEBHOOK_EVENTS = [
  "task.created", "task.updated", "task.deleted", "task.status_changed",
  "project.created", "project.deleted", "member.invited", "member.removed",
] as const;

const createWebhookSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

/**
 * GET  /api/org/[orgSlug]/webhooks  — Lista webhooks (sem secret)
 * POST /api/org/[orgSlug]/webhooks  — Cria webhook (OWNER/ADMIN)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "member:invite"); // OWNER/ADMIN

  const webhooks = await prisma.$queryRaw<
    { id: string; url: string; events: string[]; active: boolean; createdAt: Date }[]
  >`
    SELECT id, url, events, active, "createdAt"
    FROM "OrgWebhook"
    WHERE "orgId" = ${ctx.orgId}
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json({ webhooks });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "member:invite"); // OWNER/ADMIN

  const body = await req.json();
  const parsed = createWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 422 });
  }

  const secret = randomBytes(32).toString("hex");

  const webhook = await prisma.orgWebhook.create({
    data: {
      orgId: ctx.orgId,
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
    },
    select: { id: true, url: true, events: true, active: true, secret: true, createdAt: true },
  });

  // Return secret only on creation — never again
  return NextResponse.json({ webhook }, { status: 201 });
}

import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { getPlanLimits, PLAN_LABELS } from "@/billing/plan-limits";
import { countMembers } from "@/server/repo/membership-repo";
import { countPendingInvites } from "@/server/repo/invite-repo";
import { countProjects } from "@/server/repo/project-repo";

/**
 * GET /api/org/[orgSlug]/billing/usage
 * Retorna plano atual, limites e uso de recursos da org.
 * Acessível a qualquer membro autenticado (dados não sensíveis).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  const limits = getPlanLimits(ctx.plan);

  const [memberCount, pendingInvites, projectCount] = await Promise.all([
    countMembers(ctx.orgId),
    countPendingInvites(ctx.orgId),
    countProjects(ctx.orgId),
  ]);

  return NextResponse.json({
    plan: ctx.plan,
    planLabel: PLAN_LABELS[ctx.plan],
    limits,
    usage: {
      membersAndInvites: memberCount + pendingInvites,
      members: memberCount,
      pendingInvites,
      projects: projectCount,
    },
  });
}

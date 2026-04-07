import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { listMemberships } from "@/server/repo/membership-repo";

/**
 * GET /api/org/[orgSlug]/members
 *
 * Retorna lista de membros da organização com dados básicos do usuário.
 * Usado pelo seletor de responsável (assignee) no formulário de tarefas.
 *
 * Qualquer membro autenticado pode listar os membros da própria org.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  const members = await listMemberships(ctx.orgId);
  return NextResponse.json({ members });
}

import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { orgTaskQuerySchema } from "@/schemas/task";
import { listOrgTasks } from "@/server/use-cases/list-org-tasks";

/**
 * GET /api/org/[orgSlug]/tasks
 *
 * Lista tasks de toda a organização (cross-project) com filtros opcionais.
 * Usado pelo dashboard para contagens e listagem resumida.
 *
 * Query params:
 *   status   — filtra por status único (TODO, IN_PROGRESS, DONE, CANCELED)
 *   open     — "true" filtra status IN (TODO, IN_PROGRESS)
 *   updatedAfter — ISO 8601; filtra updatedAt >= valor (ex: done this week)
 *   search   — substring no título
 *   tag      — filtra por tag
 *   page     — padrão 1
 *   pageSize — 1–50, padrão 10
 *
 * Nota: Esta rota coexiste com /api/org/[orgSlug]/tasks/[taskId]/route.ts
 * que trata operações em tasks individuais. O Next.js App Router roteia
 * corretamente pelo segmento dinâmico.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const { searchParams } = new URL(req.url);
  const raw = {
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    open: searchParams.get("open") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    updatedAfter: searchParams.get("updatedAfter") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  };

  const parsed = orgTaskQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const result = await listOrgTasks(ctx, {
    ...parsed.data,
    // orgTaskQuerySchema.open is boolean after transform
    open: parsed.data.open === true ? true : undefined,
  });

  return NextResponse.json(result);
}

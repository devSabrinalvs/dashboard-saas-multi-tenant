import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { assertPermission } from "@/security/assert-permission";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

const querySchema = z.object({
  projectId: z.string().optional(),
  status: z.string().optional(),
  assigneeUserId: z.string().optional(),
});

function escapeCsv(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/org/[orgSlug]/export-csv
 *
 * Exporta tarefas como CSV com filtros opcionais.
 * Retorna application/csv com Content-Disposition attachment.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  assertPermission(ctx, "data:export");

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    projectId: searchParams.get("projectId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    assigneeUserId: searchParams.get("assigneeUserId") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 422 });

  const { projectId, status, assigneeUserId } = parsed.data;

  const projectFilter = projectId ? Prisma.sql`AND t."projectId" = ${projectId}` : Prisma.empty;
  const statusFilter = status ? Prisma.sql`AND t.status::text = ${status}` : Prisma.empty;
  const assigneeFilter = assigneeUserId ? Prisma.sql`AND t."assigneeUserId" = ${assigneeUserId}` : Prisma.empty;

  const tasks = await prisma.$queryRaw<
    {
      id: string;
      title: string;
      status: string;
      priority: string;
      dueDate: Date | null;
      tags: string[];
      projectName: string;
      assigneeName: string | null;
      assigneeEmail: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >`
    SELECT
      t.id,
      t.title,
      t.status::text,
      t.priority::text,
      t."dueDate",
      t.tags,
      p.name AS "projectName",
      u.name AS "assigneeName",
      u.email AS "assigneeEmail",
      t."createdAt",
      t."updatedAt"
    FROM "Task" t
    JOIN "Project" p ON p.id = t."projectId"
    LEFT JOIN "User" u ON u.id = t."assigneeUserId"
    WHERE t."orgId" = ${ctx.orgId}
      AND t."parentTaskId" IS NULL
      ${projectFilter}
      ${statusFilter}
      ${assigneeFilter}
    ORDER BY t."updatedAt" DESC
    LIMIT 5000
  `;

  const STATUS_PT: Record<string, string> = {
    TODO: "A fazer", IN_PROGRESS: "Em andamento", DONE: "Concluída", CANCELED: "Cancelada",
  };
  const PRIORITY_PT: Record<string, string> = {
    LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente",
  };

  const headers = ["ID", "Título", "Projeto", "Status", "Prioridade", "Responsável", "Prazo", "Tags", "Criada em", "Atualizada em"];
  const rows = tasks.map((t) => [
    escapeCsv(t.id),
    escapeCsv(t.title),
    escapeCsv(t.projectName),
    escapeCsv(STATUS_PT[t.status] ?? t.status),
    escapeCsv(PRIORITY_PT[t.priority] ?? t.priority),
    escapeCsv(t.assigneeName ?? t.assigneeEmail ?? ""),
    escapeCsv(t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : ""),
    escapeCsv(t.tags.join("; ")),
    escapeCsv(new Date(t.createdAt).toLocaleDateString("pt-BR")),
    escapeCsv(new Date(t.updatedAt).toLocaleDateString("pt-BR")),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const filename = `tarefas-${ctx.orgSlug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { prisma } from "@/lib/prisma";

export interface SearchTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  projectName: string;
}

export interface SearchProject {
  id: string;
  name: string;
  description: string | null;
}

export interface SearchResponse {
  tasks: SearchTask[];
  projects: SearchProject[];
}

/**
 * GET /api/org/[orgSlug]/search?q=TEXT
 *
 * Busca global: tasks por título + projetos por nome.
 * Mínimo 2 caracteres. Retorna até 5 tasks + 3 projetos.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  if (q.length < 2) {
    return NextResponse.json({ tasks: [], projects: [] });
  }

  const pattern = `%${q}%`;

  const [tasks, projects] = await Promise.all([
    prisma.$queryRaw<SearchTask[]>`
      SELECT t.id, t.title, t.status::text, t.priority::text,
             t."projectId", p.name AS "projectName"
      FROM "Task" t
      JOIN "Project" p ON p.id = t."projectId"
      WHERE t."orgId" = ${ctx.orgId}
        AND t."parentTaskId" IS NULL
        AND t.title ILIKE ${pattern}
      ORDER BY t."updatedAt" DESC
      LIMIT 5
    `,
    prisma.$queryRaw<SearchProject[]>`
      SELECT id, name, description
      FROM "Project"
      WHERE "orgId" = ${ctx.orgId}
        AND name ILIKE ${pattern}
      ORDER BY "updatedAt" DESC
      LIMIT 3
    `,
  ]);

  return NextResponse.json({ tasks, projects } satisfies SearchResponse);
}

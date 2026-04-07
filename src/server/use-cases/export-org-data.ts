/**
 * Use-case: exportar dados de uma organização.
 *
 * Retorna um ExportPayload v1 (JSON estruturado) contendo
 * todos os projects e tasks da org, sem dados sensíveis.
 *
 * Cada project recebe um externalId (UUID) para uso no restore.
 * As tasks referenciam o project pelo projectExternalId.
 *
 * NUNCA inclui: senhas, tokens, segredos, memberships com PII extra.
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { ExportPayload } from "@/schemas/data-export";

export interface ExportResult {
  payload: ExportPayload;
  projectCount: number;
  taskCount: number;
}

/**
 * Exporta todos os projects e tasks da organização.
 *
 * @param orgId - ID interno da organização (verificado pelo requireOrgContext)
 * @param orgSlug - slug da org (apenas para metadados do export)
 * @param orgName - nome da org (apenas para metadados do export)
 */
export async function exportOrgData(
  orgId: string,
  orgSlug: string,
  orgName: string
): Promise<ExportResult> {
  // Buscar todos os projects da org
  const projects = await prisma.project.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
  });

  // Mapear internalId → externalId para referência das tasks
  const projectExternalIdMap = new Map<string, string>(
    projects.map((p) => [p.id, randomUUID()])
  );

  // Buscar todas as tasks da org
  const tasks = await prisma.task.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      projectId: true,
      title: true,
      description: true,
      status: true,
      tags: true,
      createdAt: true,
    },
  });

  const exportProjects = projects.map((p) => ({
    externalId: projectExternalIdMap.get(p.id)!,
    name: p.name,
    description: p.description ?? null,
    createdAt: p.createdAt.toISOString(),
  }));

  const exportTasks = tasks
    // Ignorar tasks cujo project não está no mapa (não deve ocorrer, mas defensive)
    .filter((t) => projectExternalIdMap.has(t.projectId))
    .map((t) => ({
      externalId: randomUUID(),
      projectExternalId: projectExternalIdMap.get(t.projectId)!,
      title: t.title,
      description: t.description ?? null,
      status: t.status,
      tags: t.tags,
      createdAt: t.createdAt.toISOString(),
    }));

  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    org: {
      id: orgId,
      slug: orgSlug,
      name: orgName,
    },
    data: {
      projects: exportProjects,
      tasks: exportTasks,
    },
  };

  return {
    payload,
    projectCount: exportProjects.length,
    taskCount: exportTasks.length,
  };
}

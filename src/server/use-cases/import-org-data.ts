/**
 * Use-case: importar dados para uma organização.
 *
 * Recebe um ExportPayload v1 validado e cria projects + tasks
 * na organização alvo numa única transação.
 *
 * Regras:
 * - Sempre APPEND — nunca sobrescreve dados existentes.
 * - Gera novos IDs internos para tudo.
 * - Mapeia tasks → projects via projectExternalId.
 * - Suporta dryRun: valida sem gravar.
 * - Tasks cujo projectExternalId não existe no payload são ignoradas
 *   com warning (nunca falham silenciosamente).
 */

import { prisma } from "@/lib/prisma";
import type { ExportPayload } from "@/schemas/data-export";
import type { TaskStatus } from "@/generated/prisma/enums";

export interface ImportResult {
  dryRun: boolean;
  createdProjects: number;
  createdTasks: number;
  /** Tasks ignoradas por projectExternalId inválido. */
  skippedTasks: number;
  warnings: string[];
}

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportValidationError";
  }
}

/**
 * Importa dados de um payload v1 para a organização informada.
 *
 * @param orgId - ID interno da org destino (verificado antes de chamar)
 * @param payload - ExportPayload já validado via Zod
 * @param dryRun - se true, valida mas não persiste
 */
export async function importOrgData(
  orgId: string,
  payload: ExportPayload,
  dryRun: boolean
): Promise<ImportResult> {
  const warnings: string[] = [];

  const { projects, tasks } = payload.data;

  // Mapear externalId → dados do project para lookup das tasks
  const projectMap = new Map(
    projects.map((p) => [p.externalId, p])
  );

  // Validar que tasks têm projectExternalId que existe no payload
  const validTasks = tasks.filter((t) => {
    if (!projectMap.has(t.projectExternalId)) {
      warnings.push(
        `Task "${t.title}" ignorada: projectExternalId "${t.projectExternalId}" não encontrado no payload.`
      );
      return false;
    }
    return true;
  });

  const skippedTasks = tasks.length - validTasks.length;

  if (dryRun) {
    return {
      dryRun: true,
      createdProjects: projects.length,
      createdTasks: validTasks.length,
      skippedTasks,
      warnings,
    };
  }

  // Transação: criar tudo ou rollback
  await prisma.$transaction(async (tx) => {
    // Criar projects e capturar mapa externalId → ID interno
    const createdProjectIds = new Map<string, string>();

    for (const p of projects) {
      const created = await tx.project.create({
        data: {
          orgId,
          name: p.name,
          description: p.description ?? null,
        },
        select: { id: true },
      });
      createdProjectIds.set(p.externalId, created.id);
    }

    // Criar tasks usando o ID interno do project
    for (const t of validTasks) {
      const projectId = createdProjectIds.get(t.projectExternalId);
      if (!projectId) continue; // defensive — já filtrado acima

      await tx.task.create({
        data: {
          orgId,
          projectId,
          title: t.title,
          description: t.description ?? null,
          status: t.status as TaskStatus,
          tags: t.tags ?? [],
        },
      });
    }
  });

  return {
    dryRun: false,
    createdProjects: projects.length,
    createdTasks: validTasks.length,
    skippedTasks,
    warnings,
  };
}

/**
 * Cron use-case: verifica tarefas recorrentes com nextOccurrenceAt <= now
 * e cria a próxima ocorrência de cada uma.
 *
 * Best-effort: falhas individuais não interrompem o processamento das demais.
 */

import { prisma } from "@/lib/prisma";
import { computeNextOccurrence } from "@/server/repo/task-repo";

interface SpawnResult {
  checked: number;
  spawned: number;
  errors: number;
}

export async function spawnRecurringTasks(now = new Date()): Promise<SpawnResult> {
  // Busca tasks recorrentes cujo nextOccurrenceAt já passou
  const due = await prisma.$queryRaw<
    {
      id: string;
      orgId: string;
      projectId: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      tags: string[];
      assigneeUserId: string | null;
      recurrence: string;
      nextOccurrenceAt: Date;
      dueDate: Date | null;
    }[]
  >`
    SELECT id, "orgId", "projectId", title, description, status, priority, tags,
           "assigneeUserId", recurrence, "nextOccurrenceAt", "dueDate"
    FROM "Task"
    WHERE recurrence IS NOT NULL
      AND "nextOccurrenceAt" IS NOT NULL
      AND "nextOccurrenceAt" <= ${now}
    LIMIT 200
  `;

  let spawned = 0;
  let errors = 0;

  for (const task of due) {
    try {
      const newDueDate = task.nextOccurrenceAt;
      const nextNext = computeNextOccurrence(newDueDate, task.recurrence);

      await prisma.$executeRaw`
        INSERT INTO "Task" (
          id, "orgId", "projectId", title, description, status, priority,
          tags, "assigneeUserId", recurrence, "nextOccurrenceAt", "recurringParentId",
          "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid()::text,
          ${task.orgId},
          ${task.projectId},
          ${task.title},
          ${task.description},
          'TODO',
          ${task.priority},
          ${task.tags}::text[],
          ${task.assigneeUserId},
          ${task.recurrence},
          ${nextNext},
          ${task.id},
          NOW(),
          NOW()
        )
      `;

      // Avança nextOccurrenceAt no parent para o próximo ciclo
      await prisma.task.updateMany({
        where: { id: task.id },
        data: { nextOccurrenceAt: nextNext },
      });

      spawned++;
    } catch (err) {
      console.error(`[recurring-tasks] Erro ao processar task ${task.id}:`, err);
      errors++;
    }
  }

  return { checked: due.length, spawned, errors };
}

import { prisma } from "@/lib/prisma";

export type TaskActivityAction =
  | "task.created"
  | "status.changed"
  | "priority.changed"
  | "assignee.changed"
  | "title.changed"
  | "dueDate.changed"
  | "tags.changed"
  | "description.changed";

interface LogTaskActivityInput {
  taskId: string;
  orgId: string;
  userId?: string | null;
  action: TaskActivityAction;
  metadata?: Record<string, unknown>;
}

/**
 * Registra uma entrada no histórico de atividade de uma tarefa.
 * Best-effort — nunca bloqueia a operação principal.
 */
export async function logTaskActivity(input: LogTaskActivityInput): Promise<void> {
  try {
    await prisma.taskActivity.create({
      data: {
        taskId: input.taskId,
        orgId: input.orgId,
        userId: input.userId ?? null,
        action: input.action,
        metadata: (input.metadata ?? {}) as Record<string, string | number | boolean | null>,
      },
    });
  } catch {
    // best-effort — nunca propaga erro
  }
}

/**
 * Compara dois valores de task e retorna as atividades a registrar.
 */
export function diffTaskChanges(
  before: {
    title: string;
    status: string;
    priority: string;
    assigneeUserId?: string | null;
    dueDate?: Date | null;
    tags?: string[];
    description?: string | null;
  },
  after: {
    title?: string;
    status?: string;
    priority?: string;
    assigneeUserId?: string | null;
    dueDate?: Date | null;
    tags?: string[];
    description?: string | null;
  }
): Array<{ action: TaskActivityAction; metadata: Record<string, unknown> }> {
  const changes: Array<{ action: TaskActivityAction; metadata: Record<string, unknown> }> = [];

  if (after.status !== undefined && after.status !== before.status) {
    changes.push({ action: "status.changed", metadata: { from: before.status, to: after.status } });
  }
  if (after.priority !== undefined && after.priority !== before.priority) {
    changes.push({ action: "priority.changed", metadata: { from: before.priority, to: after.priority } });
  }
  if (after.title !== undefined && after.title !== before.title) {
    changes.push({ action: "title.changed", metadata: { from: before.title, to: after.title } });
  }
  if (
    after.assigneeUserId !== undefined &&
    after.assigneeUserId !== before.assigneeUserId
  ) {
    changes.push({
      action: "assignee.changed",
      metadata: { from: before.assigneeUserId ?? null, to: after.assigneeUserId ?? null },
    });
  }
  if (
    after.dueDate !== undefined &&
    String(after.dueDate) !== String(before.dueDate)
  ) {
    changes.push({
      action: "dueDate.changed",
      metadata: {
        from: before.dueDate?.toISOString() ?? null,
        to: after.dueDate?.toISOString() ?? null,
      },
    });
  }

  return changes;
}

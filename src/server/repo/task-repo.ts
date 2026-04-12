import { prisma } from "@/lib/prisma";
import type { Task } from "@/generated/prisma/client";
import type { TaskStatus, Priority } from "@/generated/prisma/enums";
import type { PaginatedResult } from "./project-repo";
export type { PaginatedResult } from "./project-repo";

export type { Task };

// ─── Org-scoped task listing (cross-project) ──────────────────────────────

export type OrgTaskListParams = {
  orgId: string;
  search?: string;
  /** Filtro por status único (ex: DONE, CANCELED) */
  status?: TaskStatus;
  /** Se true, filtra status IN (TODO, IN_PROGRESS) — ignora `status` */
  open?: boolean;
  tag?: string;
  /** Filtra por updatedAt >= updatedAfter — útil para "done this week" */
  updatedAfter?: Date;
  page: number;
  pageSize: number;
};

/**
 * Lista tasks de uma organização (cross-project) com filtros e paginação.
 * Ordenação: updatedAt DESC.
 *
 * Diferencia-se de listTasksByProject por não exigir projectId,
 * permitindo contar/listar tasks de todos os projetos da org.
 */
export async function listTasksByOrg(
  params: OrgTaskListParams
): Promise<PaginatedResult<Task>> {
  const { orgId, search, status, open, tag, updatedAfter, page, pageSize } =
    params;
  const skip = (page - 1) * pageSize;

  const statusFilter = open
    ? { status: { in: ["TODO", "IN_PROGRESS"] as TaskStatus[] } }
    : status
      ? { status }
      : {};

  const where = {
    orgId,
    ...statusFilter,
    ...(tag ? { tags: { hasSome: [tag] } } : {}),
    ...(search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(updatedAfter ? { updatedAt: { gte: updatedAfter } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── Project-scoped params ─────────────────────────────────────────────────

export type TaskListParams = {
  orgId: string;
  projectId: string;
  search?: string;
  status?: TaskStatus;
  priority?: Priority;
  tag?: string;
  /** Se fornecido, filtra tasks onde assigneeUserId = este valor */
  assigneeUserId?: string;
  page: number;
  pageSize: number;
};

/**
 * Lista tasks de um projeto com filtros e paginação.
 * Ordenação: createdAt DESC.
 */
export async function listTasksByProject(
  params: TaskListParams
): Promise<PaginatedResult<Task>> {
  const { orgId, projectId, search, status, priority, tag, assigneeUserId, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    orgId,
    projectId,
    // Nunca retorna sub-tarefas na lista principal
    parentTaskId: null,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(tag ? { tags: { hasSome: [tag] } } : {}),
    ...(search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {}),
    ...(assigneeUserId !== undefined ? { assigneeUserId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Conta o total de tasks em um projeto (com proteção cross-tenant via orgId).
 */
export async function countTasksByProject(
  orgId: string,
  projectId: string
): Promise<number> {
  return prisma.task.count({ where: { orgId, projectId } });
}

/**
 * Cria uma task no projeto.
 */
export async function createTask(data: {
  orgId: string;
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: Date | null;
  tags?: string[];
  assigneeUserId?: string | null;
}): Promise<Task> {
  return prisma.task.create({ data });
}

/**
 * Busca task por id com proteção cross-tenant.
 * Retorna null se não existir ou pertencer a outra org.
 */
export async function findTaskById(
  taskId: string,
  orgId: string
): Promise<Task | null> {
  return prisma.task.findFirst({
    where: { id: taskId, orgId },
  });
}

/**
 * Atualiza task por id com proteção cross-tenant (defense-in-depth).
 * WHERE inclui orgId para garantir isolamento mesmo em chamadas diretas ao repo.
 * Retorna null se a task não existir ou não pertencer à org.
 */
export async function updateTask(
  taskId: string,
  orgId: string,
  data: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: Date | null;
    tags?: string[];
    assigneeUserId?: string | null;
  }
): Promise<Task | null> {
  const { count } = await prisma.task.updateMany({
    where: { id: taskId, orgId },
    data,
  });
  if (count === 0) return null;
  return prisma.task.findFirst({ where: { id: taskId, orgId } });
}

/**
 * Deleta task por id com proteção cross-tenant (defense-in-depth).
 * WHERE inclui orgId para garantir isolamento.
 * Retorna null se a task não existir ou não pertencer à org.
 */
export async function deleteTask(
  taskId: string,
  orgId: string
): Promise<Task | null> {
  // findFirst verifica a pertença antes do delete (orgId na query)
  const task = await prisma.task.findFirst({ where: { id: taskId, orgId } });
  if (!task) return null;
  await prisma.task.delete({ where: { id: taskId } });
  return task;
}

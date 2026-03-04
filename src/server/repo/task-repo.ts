import { prisma } from "@/lib/prisma";
import type { Task } from "@/generated/prisma/client";
import type { TaskStatus } from "@/generated/prisma/enums";
import type { PaginatedResult } from "./project-repo";
export type { PaginatedResult } from "./project-repo";

export type { Task };

export type TaskListParams = {
  orgId: string;
  projectId: string;
  search?: string;
  status?: TaskStatus;
  tag?: string;
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
  const { orgId, projectId, search, status, tag, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    orgId,
    projectId,
    ...(status ? { status } : {}),
    ...(tag ? { tags: { hasSome: [tag] } } : {}),
    ...(search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {}),
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
 * Cria uma task no projeto.
 */
export async function createTask(data: {
  orgId: string;
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  tags?: string[];
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
 * Atualiza task por id.
 */
export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    tags?: string[];
  }
): Promise<Task> {
  return prisma.task.update({
    where: { id: taskId },
    data,
  });
}

/**
 * Deleta task por id (hard delete).
 */
export async function deleteTask(taskId: string): Promise<Task> {
  return prisma.task.delete({ where: { id: taskId } });
}

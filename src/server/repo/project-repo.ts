import { prisma } from "@/lib/prisma";
import type { Project } from "@/generated/prisma/client";

export type { Project };

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProjectListParams = {
  orgId: string;
  search?: string;
  page: number;
  pageSize: number;
};

/**
 * Lista projetos de uma organização com filtro e paginação.
 * Ordenação: createdAt DESC.
 */
export async function listProjects(
  params: ProjectListParams
): Promise<PaginatedResult<Project>> {
  const { orgId, search, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    orgId,
    ...(search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.project.count({ where }),
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
 * Conta o total de projetos de uma org.
 */
export async function countProjects(orgId: string): Promise<number> {
  return prisma.project.count({ where: { orgId } });
}

/**
 * Cria um projeto para a organização.
 */
export async function createProject(data: {
  orgId: string;
  name: string;
  description?: string;
}): Promise<Project> {
  return prisma.project.create({ data });
}

/**
 * Busca projeto por id com proteção cross-tenant.
 * Retorna null se não existir ou pertencer a outra org.
 */
export async function findProjectById(
  projectId: string,
  orgId: string
): Promise<Project | null> {
  return prisma.project.findFirst({
    where: { id: projectId, orgId },
  });
}

/**
 * Atualiza projeto por id com proteção cross-tenant (defense-in-depth).
 * WHERE inclui orgId para garantir que mesmo chamadas diretas ao repo
 * não consigam atualizar projetos de outras orgs.
 * Retorna null se o projeto não existir ou não pertencer à org.
 */
export async function updateProject(
  projectId: string,
  orgId: string,
  data: { name?: string; description?: string | null }
): Promise<Project | null> {
  const { count } = await prisma.project.updateMany({
    where: { id: projectId, orgId },
    data,
  });
  if (count === 0) return null;
  return prisma.project.findFirst({ where: { id: projectId, orgId } });
}

/**
 * Deleta projeto por id com proteção cross-tenant (defense-in-depth).
 * WHERE inclui orgId para garantir isolamento.
 * Retorna null se o projeto não existir ou não pertencer à org.
 */
export async function deleteProject(
  projectId: string,
  orgId: string
): Promise<Project | null> {
  // findFirst verifica a pertença antes do delete (orgId na query)
  const project = await prisma.project.findFirst({ where: { id: projectId, orgId } });
  if (!project) return null;
  await prisma.project.delete({ where: { id: projectId } });
  return project;
}

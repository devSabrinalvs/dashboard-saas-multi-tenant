import { prisma } from "@/shared/db";

export const projectRepo = {
  async create(data: { name: string; description?: string; orgId: string }) {
    return prisma.project.create({ data });
  },

  async listByOrg(orgId: string) {
    return prisma.project.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tasks: true } } },
    });
  },

  async findById(projectId: string, orgId: string) {
    return prisma.project.findFirst({
      where: { id: projectId, orgId },
      include: { _count: { select: { tasks: true } } },
    });
  },

  async update(projectId: string, orgId: string, data: { name?: string; description?: string }) {
    return prisma.project.update({
      where: { id: projectId, orgId },
      data,
    });
  },

  async remove(projectId: string, orgId: string) {
    return prisma.project.delete({
      where: { id: projectId, orgId },
    });
  },
};

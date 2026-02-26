import { prisma } from "@/shared/db";
import { TaskStatus } from "@prisma/client";

export const taskRepo = {
  async create(data: {
    title: string;
    description?: string;
    orgId: string;
    projectId: string;
    assigneeId?: string;
  }) {
    return prisma.task.create({ data });
  },

  async listByProject(projectId: string, orgId: string) {
    return prisma.task.findMany({
      where: { projectId, orgId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(taskId: string, orgId: string) {
    return prisma.task.findFirst({
      where: { id: taskId, orgId },
    });
  },

  async update(
    taskId: string,
    orgId: string,
    data: { title?: string; description?: string; status?: TaskStatus; assigneeId?: string | null }
  ) {
    return prisma.task.update({
      where: { id: taskId, orgId },
      data,
    });
  },

  async remove(taskId: string, orgId: string) {
    return prisma.task.delete({
      where: { id: taskId, orgId },
    });
  },
};

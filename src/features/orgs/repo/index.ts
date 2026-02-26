import { prisma } from "@/shared/db";
import { MemberRole } from "@prisma/client";

export const orgRepo = {
  async create(data: { name: string; slug: string; userId: string }) {
    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: data.name, slug: data.slug },
      });

      await tx.membership.create({
        data: {
          userId: data.userId,
          orgId: org.id,
          role: MemberRole.OWNER,
        },
      });

      await tx.auditLog.create({
        data: {
          orgId: org.id,
          userId: data.userId,
          action: "org.created",
          entity: "Organization",
          entityId: org.id,
          metadata: { name: data.name, slug: data.slug },
        },
      });

      return org;
    });
  },

  async findBySlug(slug: string) {
    return prisma.organization.findUnique({ where: { slug } });
  },

  async findByUserId(userId: string) {
    return prisma.membership.findMany({
      where: { userId },
      include: {
        org: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async slugExists(slug: string) {
    const count = await prisma.organization.count({ where: { slug } });
    return count > 0;
  },
};

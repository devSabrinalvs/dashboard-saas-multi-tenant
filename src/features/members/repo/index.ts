import { prisma } from "@/shared/db";
import { MemberRole, InviteStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

export const memberRepo = {
  async listByOrg(orgId: string) {
    return prisma.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  async createInvite(data: {
    email: string;
    role: MemberRole;
    orgId: string;
    invitedBy: string;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return prisma.invite.create({
      data: {
        email: data.email,
        role: data.role,
        orgId: data.orgId,
        invitedBy: data.invitedBy,
        token: uuidv4(),
        expiresAt,
      },
    });
  },

  async findInviteByToken(token: string) {
    return prisma.invite.findUnique({
      where: { token },
      include: { org: true },
    });
  },

  async acceptInvite(token: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({
        where: { token },
      });

      if (!invite || invite.status !== InviteStatus.PENDING) {
        throw new Error("Invalid or expired invite");
      }

      if (new Date() > invite.expiresAt) {
        throw new Error("Invite has expired");
      }

      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_orgId: { userId, orgId: invite.orgId },
        },
      });

      if (existingMembership) {
        await tx.invite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.ACCEPTED },
        });
        return existingMembership;
      }

      const membership = await tx.membership.create({
        data: {
          userId,
          orgId: invite.orgId,
          role: invite.role,
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED },
      });

      await tx.auditLog.create({
        data: {
          orgId: invite.orgId,
          userId,
          action: "member.joined",
          entity: "Membership",
          entityId: membership.id,
          metadata: { role: invite.role, viaInvite: invite.id },
        },
      });

      return membership;
    });
  },

  async listInvitesByOrg(orgId: string) {
    return prisma.invite.findMany({
      where: { orgId, status: InviteStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateRole(membershipId: string, role: MemberRole, orgId: string) {
    return prisma.membership.update({
      where: { id: membershipId, orgId },
      data: { role },
    });
  },
};

import { z } from "zod";
import { MemberRole } from "@prisma/client";

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(MemberRole).default(MemberRole.MEMBER),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.nativeEnum(MemberRole),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

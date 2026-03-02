import { z } from "zod";

/** POST /api/org/[orgSlug]/invites body */
export const createInviteSchema = z.object({
  email: z
    .string({ required_error: "Email é obrigatório" })
    .transform((v) => v.toLowerCase().trim())
    .pipe(z.string().email("Email inválido")),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/** PATCH /api/org/[orgSlug]/members/[memberId]/role body */
export const updateMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"], {
    errorMap: () => ({ message: "Role inválido" }),
  }),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

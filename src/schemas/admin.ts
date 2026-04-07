import { z } from "zod";

/**
 * Schema para busca de usuários no admin.
 */
export const adminUserSearchSchema = z.object({
  search: z
    .string()
    .min(1, "Mínimo 1 caractere")
    .max(200)
    .transform((v) => v.trim()),
});

/**
 * Schema para busca de orgs no admin.
 */
export const adminOrgSearchSchema = z.object({
  search: z
    .string()
    .min(1, "Mínimo 1 caractere")
    .max(200)
    .transform((v) => v.trim()),
});

/**
 * Schema para ações que requerem confirmação digitando o email do usuário.
 * O campo `confirm` deve ser igual ao email do usuário alvo.
 */
export const adminConfirmEmailSchema = z.object({
  confirm: z
    .string()
    .min(1)
    .transform((v) => v.trim().toLowerCase()),
});

/**
 * Schema para force-plan.
 */
export const adminForcePlanSchema = z.object({
  plan: z.enum(["FREE", "PRO", "BUSINESS"]),
  confirm: z
    .string()
    .min(1)
    .transform((v) => v.trim().toLowerCase()),
});

/**
 * Schema para paginação do audit log admin.
 */
export const adminAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).default(""),
  action: z.string().max(100).default(""),
});

import { z } from "zod";

/** POST /api/org/[orgSlug]/projects body */
export const projectCreateSchema = z.object({
  name: z
    .string({ required_error: "Nome é obrigatório" })
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(80, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

/** PATCH /api/org/[orgSlug]/projects/[projectId] body */
export const projectUpdateSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(80).optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Nenhum campo para atualizar",
  });

export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

/** GET /api/org/[orgSlug]/projects query params */
export const projectQuerySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [10, 20, 50].includes(n), {
      message: "pageSize deve ser 10, 20 ou 50",
    })
    .default(10),
});

export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;

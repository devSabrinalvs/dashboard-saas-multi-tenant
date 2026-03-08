import { z } from "zod";

/** GET /api/org/[orgSlug]/audit query params */
export const auditQuerySchema = z.object({
  action: z.string().max(100).optional(),
  search: z.string().max(100).optional(),
  actorId: z.string().optional(),
  from: z.string().datetime({ message: "from deve ser ISO 8601 válido" }).optional(),
  to: z.string().datetime({ message: "to deve ser ISO 8601 válido" }).optional(),
  page: z.coerce.number().int().min(1, "page deve ser >= 1").default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [10, 20, 50].includes(n), {
      message: "pageSize deve ser 10, 20 ou 50",
    })
    .default(10),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;

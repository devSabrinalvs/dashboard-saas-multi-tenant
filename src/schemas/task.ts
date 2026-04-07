import { z } from "zod";

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"] as const;

/** POST /api/org/[orgSlug]/projects/[projectId]/tasks body */
export const taskCreateSchema = z.object({
  title: z
    .string({ required_error: "Título é obrigatório" })
    .min(2, "Título deve ter pelo menos 2 caracteres")
    .max(200, "Título muito longo"),
  description: z.string().max(2000, "Descrição muito longa").optional(),
  status: z.enum(TASK_STATUSES).default("TODO"),
  tags: z
    .array(z.string().max(24, "Tag muito longa"))
    .max(10, "Máximo 10 tags")
    .default([]),
  assigneeUserId: z.string().nullable().optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

/** PATCH /api/org/[orgSlug]/tasks/[taskId] body */
export const taskUpdateSchema = z
  .object({
    title: z
      .string()
      .min(2, "Título deve ter pelo menos 2 caracteres")
      .max(200)
      .optional(),
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    tags: z.array(z.string().max(24)).max(10).optional(),
    assigneeUserId: z.string().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Nenhum campo para atualizar",
  });

export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

/** GET /api/org/[orgSlug]/projects/[projectId]/tasks query params */
export const taskQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  tag: z.string().max(24).optional(),
  /** "me" = filtrar por tasks atribuídas ao usuário autenticado */
  assignedTo: z.enum(["me"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [10, 20, 50].includes(n), {
      message: "pageSize deve ser 10, 20 ou 50",
    })
    .default(10),
});

export type TaskQueryInput = z.infer<typeof taskQuerySchema>;

/** GET /api/org/[orgSlug]/tasks (cross-project) query params */
export const orgTaskQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  /** true = filtra status IN (TODO, IN_PROGRESS) */
  open: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  tag: z.string().max(24).optional(),
  /** ISO 8601 — filtra updatedAt >= updatedAfter (ex: done this week) */
  updatedAfter: z
    .string()
    .datetime({ message: "updatedAfter deve ser ISO 8601 válido" })
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type OrgTaskQueryInput = z.infer<typeof orgTaskQuerySchema>;

/** PATCH /api/org/[orgSlug]/tasks/bulk body */
export const taskBulkActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setStatus"),
    taskIds: z
      .array(z.string().uuid())
      .min(1, "Selecione ao menos uma tarefa")
      .max(100, "Máximo 100 tarefas por operação"),
    status: z.enum(TASK_STATUSES),
  }),
  z.object({
    action: z.literal("delete"),
    taskIds: z
      .array(z.string().uuid())
      .min(1, "Selecione ao menos uma tarefa")
      .max(100, "Máximo 100 tarefas por operação"),
  }),
]);

export type TaskBulkActionInput = z.infer<typeof taskBulkActionSchema>;

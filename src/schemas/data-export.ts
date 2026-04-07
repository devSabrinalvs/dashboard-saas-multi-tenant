/**
 * Schemas Zod para export/import de dados de organização — v1.
 *
 * Formato export v1:
 * {
 *   version: 1,
 *   exportedAt: "<ISO>",
 *   org: { id, slug, name },
 *   data: {
 *     projects: [{ externalId, name, description, createdAt }],
 *     tasks: [{ externalId, projectExternalId, title, description, status, tags, createdAt }]
 *   }
 * }
 *
 * Limites de import:
 * - 500 projects por payload
 * - 5000 tasks por payload
 * - 5 MB de tamanho raw (verificado pelo route handler)
 *
 * Restrições de campos (sanitização):
 * - project.name: max 120 chars
 * - task.title: max 160 chars
 * - task.tags: max 10 tags, cada uma max 24 chars
 * - strings sem HTML (mantidos como texto puro via trim)
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Limites
// ---------------------------------------------------------------------------

export const EXPORT_LIMITS = {
  MAX_PROJECTS: 500,
  MAX_TASKS: 5_000,
  MAX_PAYLOAD_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_PROJECT_NAME: 120,
  MAX_TASK_TITLE: 160,
  MAX_TAG_LENGTH: 24,
  MAX_TAGS_PER_TASK: 10,
  MAX_DESCRIPTION: 2000,
} as const;

// ---------------------------------------------------------------------------
// Schema de um project no export
// ---------------------------------------------------------------------------

export const exportProjectSchema = z.object({
  externalId: z.string().uuid(),
  name: z.string().min(1).max(EXPORT_LIMITS.MAX_PROJECT_NAME).transform((v) => v.trim()),
  description: z
    .string()
    .max(EXPORT_LIMITS.MAX_DESCRIPTION)
    .transform((v) => v.trim())
    .nullable()
    .optional(),
  createdAt: z.string().datetime(),
});

export type ExportProject = z.infer<typeof exportProjectSchema>;

// ---------------------------------------------------------------------------
// Schema de uma task no export
// ---------------------------------------------------------------------------

export const VALID_TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"] as const;

export const exportTaskSchema = z.object({
  externalId: z.string().uuid(),
  projectExternalId: z.string().uuid(),
  title: z.string().min(1).max(EXPORT_LIMITS.MAX_TASK_TITLE).transform((v) => v.trim()),
  description: z
    .string()
    .max(EXPORT_LIMITS.MAX_DESCRIPTION)
    .transform((v) => v.trim())
    .nullable()
    .optional(),
  status: z.enum(VALID_TASK_STATUSES),
  tags: z
    .array(z.string().max(EXPORT_LIMITS.MAX_TAG_LENGTH).transform((v) => v.trim()))
    .max(EXPORT_LIMITS.MAX_TAGS_PER_TASK)
    .default([]),
  createdAt: z.string().datetime(),
});

export type ExportTask = z.infer<typeof exportTaskSchema>;

// ---------------------------------------------------------------------------
// Schema do payload completo de export/import v1
// ---------------------------------------------------------------------------

export const exportPayloadSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  org: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
  }),
  data: z.object({
    projects: z
      .array(exportProjectSchema)
      .max(EXPORT_LIMITS.MAX_PROJECTS, `Máximo de ${EXPORT_LIMITS.MAX_PROJECTS} projetos por import`),
    tasks: z
      .array(exportTaskSchema)
      .max(EXPORT_LIMITS.MAX_TASKS, `Máximo de ${EXPORT_LIMITS.MAX_TASKS} tasks por import`),
  }),
});

export type ExportPayload = z.infer<typeof exportPayloadSchema>;

// ---------------------------------------------------------------------------
// Schema do query string de import
// ---------------------------------------------------------------------------

export const importQuerySchema = z.object({
  dryRun: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type ImportQuery = z.infer<typeof importQuerySchema>;

import { z } from "zod";
import { slugify } from "@/shared/utils/slugify";

/**
 * Schema para o formulário client-side.
 * Slug é opcional — o servidor gera automaticamente se vazio.
 */
export const createOrgFormSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(80, "Nome deve ter no máximo 80 caracteres"),
  slug: z
    .string()
    .max(40, "Slug deve ter no máximo 40 caracteres")
    .regex(/^[a-z0-9-]*$/, "Slug: apenas letras minúsculas, números e hífens")
    .optional()
    .or(z.literal("")),
});

export type CreateOrgFormData = z.infer<typeof createOrgFormSchema>;

/**
 * Schema para o route handler (server-side).
 * Aplica transform: gera slug a partir do name se não informado.
 * Então valida o slug final (gerado ou informado).
 */
export const createOrgApiSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(80, "Nome deve ter no máximo 80 caracteres"),
    slug: z.string().optional(),
  })
  .transform((data) => ({
    name: data.name.trim(),
    slug: data.slug?.trim() ? data.slug.trim() : slugify(data.name),
  }))
  .pipe(
    z.object({
      name: z.string(),
      slug: z
        .string()
        .min(3, "Slug deve ter pelo menos 3 caracteres")
        .max(40, "Slug deve ter no máximo 40 caracteres")
        .regex(
          /^[a-z0-9-]+$/,
          "Slug: apenas letras minúsculas, números e hífens"
        ),
    })
  );

export type CreateOrgApiInput = z.infer<typeof createOrgApiSchema>;

"use server";

import { createProjectSchema } from "../schemas";
import { projectRepo } from "../repo";
import { resolveOrgContext, assertPermission } from "@/shared/security";

export async function createProjectAction(orgSlug: string, formData: FormData) {
  const context = await resolveOrgContext(orgSlug);
  assertPermission(context, "project:create");

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
  };

  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const project = await projectRepo.create({
    ...parsed.data,
    orgId: context.orgId,
  });

  return { data: project };
}

export async function deleteProjectAction(orgSlug: string, projectId: string) {
  const context = await resolveOrgContext(orgSlug);
  assertPermission(context, "project:delete");

  await projectRepo.remove(projectId, context.orgId);
  return { success: true };
}

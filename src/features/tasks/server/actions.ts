"use server";

import { createTaskSchema, updateTaskSchema } from "../schemas";
import { taskRepo } from "../repo";
import { resolveOrgContext, assertPermission } from "@/shared/security";

export async function createTaskAction(orgSlug: string, formData: FormData) {
  const context = await resolveOrgContext(orgSlug);
  assertPermission(context, "task:create");

  const raw = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    projectId: formData.get("projectId") as string,
    assigneeId: (formData.get("assigneeId") as string) || undefined,
  };

  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const task = await taskRepo.create({
    ...parsed.data,
    orgId: context.orgId,
  });

  return { data: task };
}

export async function updateTaskStatusAction(
  orgSlug: string,
  taskId: string,
  status: string
) {
  const context = await resolveOrgContext(orgSlug);
  assertPermission(context, "task:update");

  const parsed = updateTaskSchema.safeParse({ status });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const task = await taskRepo.update(taskId, context.orgId, parsed.data);
  return { data: task };
}

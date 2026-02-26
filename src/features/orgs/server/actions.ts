"use server";

import { createOrgSchema } from "../schemas";
import { orgRepo } from "../repo";
import { requireUserId } from "@/shared/security";

export async function createOrgAction(formData: FormData) {
  const userId = await requireUserId();

  const raw = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
  };

  const parsed = createOrgSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const slugTaken = await orgRepo.slugExists(parsed.data.slug);
  if (slugTaken) {
    return { error: { slug: ["This slug is already taken"] } };
  }

  const org = await orgRepo.create({
    ...parsed.data,
    userId,
  });

  return { data: org };
}

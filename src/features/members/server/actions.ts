"use server";

import { inviteMemberSchema } from "../schemas";
import { memberRepo } from "../repo";
import { resolveOrgContext, assertPermission } from "@/shared/security";

export async function inviteMemberAction(orgSlug: string, formData: FormData) {
  const context = await resolveOrgContext(orgSlug);
  assertPermission(context, "member:invite");

  const raw = {
    email: formData.get("email") as string,
    role: (formData.get("role") as string) || "MEMBER",
  };

  const parsed = inviteMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const invite = await memberRepo.createInvite({
    email: parsed.data.email,
    role: parsed.data.role,
    orgId: context.orgId,
    invitedBy: context.userId,
  });

  return { data: invite };
}

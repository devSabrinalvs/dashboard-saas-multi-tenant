import { redirect } from "next/navigation";
import { requireAuth } from "@/server/auth/require-auth";
import { findOrgsByUserId } from "@/server/repo/organization-repo";
import { OrgSelectClient } from "./org-select-client";

export default async function OrgSelectPage() {
  const auth = await requireAuth();
  const orgs = await findOrgsByUserId(auth.userId);

  if (orgs.length === 0) {
    redirect("/org/new");
  }

  if (orgs.length === 1) {
    redirect(`/org/${orgs[0]!.slug}/dashboard`);
  }

  return <OrgSelectClient orgs={orgs} />;
}

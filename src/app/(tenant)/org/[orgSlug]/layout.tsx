import { requireOrgContext } from "@/server/org/require-org-context";
import { findOrgsByUserId } from "@/server/repo/organization-repo";
import { AppShell } from "@/components/layout/app-shell";
import { can } from "@/security/rbac";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  const userOrgs = await findOrgsByUserId(ctx.userId);
  const canAudit = can(ctx.role, "audit:read");

  return (
    <AppShell
      userEmail={ctx.email}
      orgSlug={ctx.orgSlug}
      orgName={ctx.orgName}
      userOrgs={userOrgs}
      canAudit={canAudit}
    >
      {children}
    </AppShell>
  );
}

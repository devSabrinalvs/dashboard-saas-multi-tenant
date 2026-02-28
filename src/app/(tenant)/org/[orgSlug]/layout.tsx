import { requireOrgContext } from "@/server/org/require-org-context";
import { AppShell } from "@/components/layout/app-shell";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  return (
    <AppShell userEmail={ctx.email} orgSlug={ctx.orgSlug} orgName={ctx.orgName}>
      {children}
    </AppShell>
  );
}

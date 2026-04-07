import { requireOrgContext } from "@/server/org/require-org-context";
import { findOrgsByUserId } from "@/server/repo/organization-repo";
import { findOrgBySlug } from "@/server/repo/organization-repo";
import { AppShell } from "@/components/layout/app-shell";
import { SessionPing } from "@/components/layout/session-ping";
import { WelcomeBanner } from "@/features/onboarding/components/welcome-banner";
import { can } from "@/security/rbac";
import { computeBillingState } from "@/billing/billing-state";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);
  const [userOrgs, org] = await Promise.all([
    findOrgsByUserId(ctx.userId),
    findOrgBySlug(orgSlug),
  ]);

  const canAudit = can(ctx.role, "audit:read");
  const canBilling = ctx.role === "OWNER";
  const canDataExport = can(ctx.role, "data:export");

  // Computar estado de billing para o banner global
  // Precisamos dos campos da org que não estão no OrgContext
  const billingBanner = org
    ? (() => {
        const state = computeBillingState({
          plan: org.plan,
          subscriptionStatus: org.subscriptionStatus ?? null,
          graceUntil: org.graceUntil ?? null,
          cancelAtPeriodEnd: org.cancelAtPeriodEnd,
          currentPeriodEnd: org.currentPeriodEnd ?? null,
        });

        if (!state.bannerType) return null;

        return {
          bannerType: state.bannerType,
          graceUntilMs: state.graceUntil?.getTime() ?? null,
          currentPeriodEndMs: state.currentPeriodEnd?.getTime() ?? null,
        };
      })()
    : null;

  return (
    <AppShell
      userEmail={ctx.email}
      orgSlug={ctx.orgSlug}
      orgName={ctx.orgName}
      userOrgs={userOrgs}
      canAudit={canAudit}
      canBilling={canBilling}
      canDataExport={canDataExport}
      billingBanner={billingBanner}
    >
      <SessionPing />
      <WelcomeBanner orgSlug={ctx.orgSlug} orgName={ctx.orgName} />
      {children}
    </AppShell>
  );
}

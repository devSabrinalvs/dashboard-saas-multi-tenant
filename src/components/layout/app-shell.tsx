import { SidebarNav } from "./sidebar-nav";
import type { OrgLink } from "./org-switcher";
import { BillingBanner } from "@/features/billing/components/billing-banner";
import type { BillingBannerType } from "@/billing/billing-state";

interface AppShellProps {
  children: React.ReactNode;
  userEmail: string;
  userName?: string | null;
  orgSlug: string;
  orgName: string;
  userOrgs: OrgLink[];
  canAudit?: boolean;
  canBilling?: boolean;
  canDataExport?: boolean;
  /** Dados de billing para o banner global. Null = sem banner. */
  billingBanner?: {
    bannerType: BillingBannerType;
    graceUntilMs: number | null;
    currentPeriodEndMs: number | null;
  } | null;
}

export function AppShell({
  children,
  userEmail,
  userName,
  orgSlug,
  orgName,
  userOrgs,
  canAudit,
  canBilling,
  canDataExport,
  billingBanner,
}: AppShellProps) {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#080808",
        overflow: "hidden",
      }}
    >
      <SidebarNav
        orgSlug={orgSlug}
        orgName={orgName}
        userOrgs={userOrgs}
        userEmail={userEmail}
        userName={userName}
        canAudit={canAudit}
        canBilling={canBilling}
        canDataExport={canDataExport}
      />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 40px 48px",
          position: "relative",
        }}
      >
        {billingBanner?.bannerType && (
          <BillingBanner
            bannerType={billingBanner.bannerType}
            orgSlug={orgSlug}
            graceUntilMs={billingBanner.graceUntilMs}
            currentPeriodEndMs={billingBanner.currentPeriodEndMs}
            canManageBilling={!!canBilling}
          />
        )}
        {children}
      </main>
    </div>
  );
}

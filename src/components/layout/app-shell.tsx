import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";
import type { OrgLink } from "./org-switcher";
import { BillingBanner } from "@/features/billing/components/billing-banner";
import type { BillingBannerType } from "@/billing/billing-state";

interface AppShellProps {
  children: React.ReactNode;
  userEmail: string;
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
  orgSlug,
  orgName,
  userOrgs,
  canAudit,
  canBilling,
  canDataExport,
  billingBanner,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav orgSlug={orgSlug} orgName={orgName} userOrgs={userOrgs} canAudit={canAudit} canBilling={canBilling} canDataExport={canDataExport} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userEmail={userEmail} orgName={orgName} />
        <main className="flex-1 overflow-auto p-6">
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
    </div>
  );
}

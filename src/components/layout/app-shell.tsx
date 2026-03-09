import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";
import type { OrgLink } from "./org-switcher";

interface AppShellProps {
  children: React.ReactNode;
  userEmail: string;
  orgSlug: string;
  orgName: string;
  userOrgs: OrgLink[];
  canAudit?: boolean;
}

export function AppShell({
  children,
  userEmail,
  orgSlug,
  orgName,
  userOrgs,
  canAudit,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav orgSlug={orgSlug} orgName={orgName} userOrgs={userOrgs} canAudit={canAudit} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userEmail={userEmail} orgName={orgName} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";
import type { OrgLink } from "./org-switcher";

interface AppShellProps {
  children: React.ReactNode;
  userEmail: string;
  orgSlug: string;
  orgName: string;
  userOrgs: OrgLink[];
}

export function AppShell({
  children,
  userEmail,
  orgSlug,
  orgName,
  userOrgs,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav orgSlug={orgSlug} orgName={orgName} userOrgs={userOrgs} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

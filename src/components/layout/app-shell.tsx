import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

interface AppShellProps {
  children: React.ReactNode;
  userEmail: string;
}

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

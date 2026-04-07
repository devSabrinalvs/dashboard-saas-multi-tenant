import { AdminSidebar } from "./admin-sidebar";

interface AdminShellProps {
  children: React.ReactNode;
  adminEmail: string;
}

export function AdminShell({ children, adminEmail }: AdminShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-6">
          <h1 className="text-sm font-semibold text-destructive">
            Admin Console — Acesso restrito
          </h1>
          <span className="text-xs text-muted-foreground">{adminEmail}</span>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

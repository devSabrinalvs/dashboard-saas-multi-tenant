import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSuperAdmin();

  return <AdminShell adminEmail={ctx.email}>{children}</AdminShell>;
}

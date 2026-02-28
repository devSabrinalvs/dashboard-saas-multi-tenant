import { requireAuth } from "@/server/auth/require-auth";

/**
 * Layout do grupo (app): garante autenticação sem aplicar AppShell.
 * O AppShell é aplicado pelo grupo (tenant) que tem contexto de org.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return <>{children}</>;
}

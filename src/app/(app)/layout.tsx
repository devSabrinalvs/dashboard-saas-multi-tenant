import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <AppShell userEmail={session.user.email ?? ""}>{children}</AppShell>;
}

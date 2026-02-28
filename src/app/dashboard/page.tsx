import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  // Defense-in-depth: o middleware já bloqueia, mas verificamos
  // novamente aqui caso o matcher mude ou seja burlado.
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <div className="rounded-md bg-muted p-4 text-sm">
          <p>
            Logado como{" "}
            <span className="font-medium">{session.user.email}</span>
          </p>
          {session.user.name && (
            <p className="text-muted-foreground">Nome: {session.user.name}</p>
          )}
        </div>

        <SignOutButton />
      </div>
    </div>
  );
}

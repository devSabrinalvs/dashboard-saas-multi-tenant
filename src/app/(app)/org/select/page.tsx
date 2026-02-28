import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/server/auth/require-auth";
import { findOrgsByUserId } from "@/server/repo/organization-repo";
import { Building2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OrgSelectPage() {
  const auth = await requireAuth();
  const orgs = await findOrgsByUserId(auth.userId);

  // Auto-redirect se o usuário tem apenas 1 organização
  if (orgs.length === 1) {
    redirect(`/org/${orgs[0]!.slug}/dashboard`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Escolha uma organização</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Você pertence a {orgs.length} organização
            {orgs.length !== 1 ? "s" : ""}.
          </p>
        </div>

        {orgs.length === 0 ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-base">Sem organizações</CardTitle>
              <CardDescription>
                Você não pertence a nenhuma organização ainda. Peça um convite
                ao administrador.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-2">
            {orgs.map((org) => (
              <Link key={org.id} href={`/org/${org.slug}/dashboard`}>
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                  <CardHeader className="flex flex-row items-center gap-3 py-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted">
                      <Building2 className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm">
                        {org.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {org.slug}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

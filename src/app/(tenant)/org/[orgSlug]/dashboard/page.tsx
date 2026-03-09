import Link from "next/link";
import { requireOrgContext } from "@/server/org/require-org-context";
import { can } from "@/security/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Users, FolderKanban, CheckSquare, Plus, ShieldCheck } from "lucide-react";

const METRIC_CARDS = [
  {
    title: "Membros",
    description: "Membros ativos na organização",
    icon: Users,
  },
  {
    title: "Projetos",
    description: "Projetos em andamento",
    icon: FolderKanban,
  },
  {
    title: "Tarefas",
    description: "Tarefas abertas",
    icon: CheckSquare,
  },
] as const;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const canCreateProject = can(ctx.role, "project:create");
  const canReadAudit = can(ctx.role, "audit:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Bem-vindo à ${ctx.orgName}. Seu papel é ${ctx.role.toLowerCase()}.`}
      />

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {METRIC_CARDS.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>{description}</CardDescription>
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="size-4 text-primary" aria-hidden />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold tabular-nums">—</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Dados disponíveis em breve
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações rápidas</CardTitle>
          <CardDescription>
            Ações disponíveis para o seu papel nesta organização.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {canCreateProject ? (
            <Button asChild size="sm">
              <Link href={`/org/${orgSlug}/projects`}>
                <Plus className="size-4" />
                Novo Projeto
              </Link>
            </Button>
          ) : (
            <Button size="sm" disabled>
              <Plus className="size-4" />
              Novo Projeto
            </Button>
          )}

          {canReadAudit ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/org/${orgSlug}/audit`}>
                <ShieldCheck className="size-4" />
                Ver Audit Log
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ShieldCheck className="size-4" />
              Ver Audit Log
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

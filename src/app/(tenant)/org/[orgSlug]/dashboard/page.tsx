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

const placeholderCards = [
  { title: "Usuários", description: "Membros ativos na organização" },
  { title: "Projetos", description: "Projetos em andamento" },
  { title: "Tarefas", description: "Tarefas abertas" },
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
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo à{" "}
          <span className="font-medium text-foreground">{ctx.orgName}</span>.
          Você é{" "}
          <span className="font-medium text-foreground">
            {ctx.role.toLowerCase()}
          </span>{" "}
          desta organização.
        </p>
      </div>

      {/* Placeholder metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {placeholderCards.map(({ title, description }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardDescription>{description}</CardDescription>
              <CardTitle className="text-2xl">—</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Dados disponíveis em breve
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ações — hint visual de RBAC (segurança garantida server-side) */}
      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
          <CardDescription>
            Ações disponíveis para o seu papel nesta organização.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex flex-col items-start gap-1">
            <Button disabled={!canCreateProject}>Criar Project</Button>
            {!canCreateProject && (
              <p className="text-xs text-muted-foreground">Sem permissão</p>
            )}
          </div>

          <div className="flex flex-col items-start gap-1">
            <Button disabled={!canReadAudit} variant="outline">
              Ver Audit Log
            </Button>
            {!canReadAudit && (
              <p className="text-xs text-muted-foreground">Sem permissão</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contexto de tenant — remover em produção */}
      <Card>
        <CardHeader>
          <CardTitle>Contexto de Tenant</CardTitle>
          <CardDescription>
            Informações resolvidas server-side para esta sessão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1 text-sm">
            {(
              [
                ["Org ID", ctx.orgId],
                ["Org Slug", ctx.orgSlug],
                ["User ID", ctx.userId],
                ["Role", ctx.role],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="w-24 shrink-0 font-medium text-muted-foreground">
                  {label}
                </dt>
                <dd className="truncate font-mono text-xs">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

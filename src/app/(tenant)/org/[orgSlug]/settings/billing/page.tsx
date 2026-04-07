import { notFound } from "next/navigation";
import { requireOrgContext } from "@/server/org/require-org-context";
import { getPlanLimits, PLAN_LABELS, RESOURCE_LABELS } from "@/billing/plan-limits";
import { countMembers } from "@/server/repo/membership-repo";
import { countPendingInvites } from "@/server/repo/invite-repo";
import { countProjects } from "@/server/repo/project-repo";
import { findOrgBySlug } from "@/server/repo/organization-repo";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Users, FolderKanban, CheckSquare, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BillingActions } from "@/features/billing/components/billing-actions";

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({
  label,
  current,
  limit,
  icon: Icon,
}: {
  label: string;
  current: number;
  limit: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pct = Math.min(100, Math.round((current / limit) * 100));
  const isWarning = pct >= 80;
  const isFull = pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {label}
        </span>
        <span
          className={cn(
            "tabular-nums",
            isFull
              ? "text-destructive font-semibold"
              : isWarning
                ? "text-amber-600 dark:text-amber-400 font-medium"
                : "text-muted-foreground"
          )}
        >
          {current} / {limit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isFull ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isFull && (
        <p className="text-xs text-destructive">
          Limite atingido — faça upgrade para adicionar mais.
        </p>
      )}
    </div>
  );
}

// ─── Plan badge ───────────────────────────────────────────────────────────────

const planVariant: Record<string, "default" | "secondary" | "outline"> = {
  FREE: "secondary",
  PRO: "default",
  BUSINESS: "outline",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  // Apenas OWNERs acessam esta página
  if (ctx.role !== "OWNER") notFound();

  const [org, memberCount, pendingInvites, projectCount] = await Promise.all([
    findOrgBySlug(orgSlug),
    countMembers(ctx.orgId),
    countPendingInvites(ctx.orgId),
    countProjects(ctx.orgId),
  ]);

  if (!org) notFound();

  const limits = getPlanLimits(ctx.plan);
  const seatsUsed = memberCount + pendingInvites;
  const isPastDue = org.subscriptionStatus === "PAST_DUE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plano &amp; Uso</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe o consumo de recursos de{" "}
          <span className="font-medium text-foreground">{ctx.orgName}</span>.
        </p>
      </div>

      <Separator />

      {/* Banner PAST_DUE */}
      {isPastDue && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            <strong>Pagamento pendente.</strong> Sua assinatura está com pagamento
            em atraso. Atualize seu método de pagamento para evitar a perda de
            acesso às funcionalidades do plano.
          </AlertDescription>
        </Alert>
      )}

      {/* Plano atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-muted-foreground" />
              <CardTitle className="text-base">Plano atual</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isPastDue && (
                <Badge variant="destructive" className="text-xs">
                  Pagamento pendente
                </Badge>
              )}
              <Badge variant={planVariant[ctx.plan] ?? "secondary"}>
                {PLAN_LABELS[ctx.plan]}
              </Badge>
            </div>
          </div>
          <CardDescription>
            {ctx.plan === "FREE"
              ? "Upgrade para Pro ou Business para aumentar os limites."
              : ctx.plan === "PRO"
                ? "Você está no plano Pro."
                : "Você está no plano Business com os maiores limites disponíveis."}
            {org.currentPeriodEnd && (
              <span className="ml-1">
                Renovação em{" "}
                {new Intl.DateTimeFormat("pt-BR").format(org.currentPeriodEnd)}.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingActions
            orgSlug={orgSlug}
            currentPlan={ctx.plan}
            hasStripeCustomer={!!org.stripeCustomerId}
          />
        </CardContent>
      </Card>

      {/* Uso de recursos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso de recursos</CardTitle>
          <CardDescription>
            Consumo atual em relação ao limite do plano {PLAN_LABELS[ctx.plan]}.
            Convites pendentes contam como assentos reservados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <UsageBar
            label={RESOURCE_LABELS.members}
            current={seatsUsed}
            limit={limits.maxMembers}
            icon={Users}
          />
          <Separator />
          <UsageBar
            label={RESOURCE_LABELS.projects}
            current={projectCount}
            limit={limits.maxProjects}
            icon={FolderKanban}
          />
          <Separator />
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <CheckSquare className="size-4 text-muted-foreground" />
              {RESOURCE_LABELS.tasks_per_project}
            </div>
            <p className="text-sm text-muted-foreground">
              Limite de{" "}
              <span className="font-medium text-foreground">
                {limits.maxTasksPerProject.toLocaleString()}
              </span>{" "}
              tarefas por projeto no plano {PLAN_LABELS[ctx.plan]}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  FolderKanban,
  CheckSquare,
  TrendingUp,
  Users,
  ShieldCheck,
  Plus,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardKpiCard } from "./dashboard-kpi-card";
import { DashboardSection } from "./dashboard-section";
import { TaskListItem } from "./task-list-item";
import { ActivityItem } from "./activity-item";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { useMyOpenTasks } from "@/features/dashboard/hooks/use-my-open-tasks";
import { useRecentActivity } from "@/features/dashboard/hooks/use-recent-activity";
import { useAnalytics } from "@/features/dashboard/hooks/use-analytics";
import { TasksByWeekChart } from "./charts/tasks-by-week-chart";
import { TasksByMemberChart } from "./charts/tasks-by-member-chart";
import { TasksByPriorityChart } from "./charts/tasks-by-priority-chart";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DashboardClientProps {
  orgSlug: string;
  orgName: string;
  /** Role textual para o subtítulo */
  role: string;
  membersCount: number;
  canAudit: boolean;
  canCreateProject: boolean;
  canCreateTask: boolean;
  canInvite: boolean;
}

// ─── Skeleton helpers ────────────────────────────────────────────────────────

function TaskSkeletons() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2.5">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20 ml-3 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ActivitySkeletons() {
  return (
    <div className="space-y-1 divide-y">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start justify-between py-2.5 gap-3">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-12 mt-1" />
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardClient({
  orgSlug,
  orgName,
  role,
  membersCount,
  canAudit,
  canCreateProject,
  canCreateTask,
  canInvite,
}: DashboardClientProps) {
  const { summary, isLoading: summaryLoading, isError: summaryError, errors: summaryErrors } =
    useDashboardSummary(orgSlug);

  const {
    data: openTasksData,
    isLoading: openTasksLoading,
    isError: openTasksError,
    error: openTasksErr,
    refetch: refetchOpenTasks,
  } = useMyOpenTasks(orgSlug);

  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
    error: activityErr,
    refetch: refetchActivity,
  } = useRecentActivity(orgSlug, canAudit);

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useAnalytics(orgSlug);

  const openTasks = openTasksData?.items.slice(0, 5) ?? [];
  const activityLogs = activityData?.items.slice(0, 5) ?? [];

  const hasQuickActions = canCreateProject || canCreateTask || canInvite;

  return (
    <div className="space-y-6" data-testid="dashboard-client">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Dashboard"
        subtitle={`${orgName} · Seu papel: ${role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}`}
      >
        {canCreateProject && (
          <Button asChild size="sm">
            <Link href={`/org/${orgSlug}/projects`}>
              <Plus className="size-4" />
              Novo Projeto
            </Link>
          </Button>
        )}
      </PageHeader>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
        data-testid="kpi-grid"
      >
        <DashboardKpiCard
          icon={FolderKanban}
          label="Projetos"
          value={summary?.projectsTotal}
          isLoading={summaryLoading}
          hint="Total na organização"
          data-testid="kpi-projects"
        />
        <DashboardKpiCard
          icon={CheckSquare}
          label="Tarefas abertas"
          value={summary?.openTasksTotal}
          isLoading={summaryLoading}
          hint="TODO + Em andamento"
          variant="warning"
          data-testid="kpi-open-tasks"
        />
        <DashboardKpiCard
          icon={TrendingUp}
          label="Concluídas esta semana"
          value={summary?.doneThisWeekTotal}
          isLoading={summaryLoading}
          hint="DONE nos últimos 7 dias"
          variant="success"
          data-testid="kpi-done-week"
        />
        <DashboardKpiCard
          icon={Users}
          label="Membros"
          value={membersCount}
          hint="Total na organização"
          data-testid="kpi-members"
        />
      </div>

      {/* ── KPI error ──────────────────────────────────────────────────────── */}
      {summaryError && (
        <ErrorState
          description={`Erro ao carregar métricas: ${summaryErrors[0]?.message ?? "tente novamente"}`}
        />
      )}

      {/* ── Two-column layout: My Work | Recent Activity ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Work */}
        <Card data-testid="my-work-section">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Minhas tarefas</CardTitle>
              <Link
                href={`/org/${orgSlug}/projects`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver projetos →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {openTasksLoading && <TaskSkeletons />}

            {openTasksError && (
              <ErrorState
                description={openTasksErr?.message ?? "Erro ao carregar tarefas"}
                onRetry={() => void refetchOpenTasks()}
              />
            )}

            {!openTasksLoading && !openTasksError && openTasks.length === 0 && (
              <EmptyState
                icon={CheckSquare}
                title="Sem tarefas abertas"
                subtitle="Nenhuma tarefa em aberto nesta organização."
                action={
                  canCreateTask ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/org/${orgSlug}/projects`}>
                        <Plus className="size-4" />
                        Criar tarefa
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            )}

            {!openTasksLoading && !openTasksError && openTasks.length > 0 && (
              <div className="divide-y">
                {openTasks.map((task) => (
                  <TaskListItem key={task.id} task={task} orgSlug={orgSlug} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {canAudit ? (
          <Card data-testid="recent-activity-section">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Atividade recente</CardTitle>
                <Link
                  href={`/org/${orgSlug}/audit`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ver audit log →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activityLoading && <ActivitySkeletons />}

              {activityError && (
                <ErrorState
                  description={activityErr?.message ?? "Erro ao carregar atividade"}
                  onRetry={() => void refetchActivity()}
                />
              )}

              {!activityLoading && !activityError && activityLogs.length === 0 && (
                <EmptyState
                  icon={ShieldCheck}
                  title="Sem atividade recente"
                  subtitle="Nenhuma ação registrada nos últimos 7 dias."
                />
              )}

              {!activityLoading && !activityError && activityLogs.length > 0 && (
                <div className="divide-y">
                  {activityLogs.map((log) => (
                    <ActivityItem key={log.id} log={log} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Placeholder para manter o grid equilibrado em telas sem audit */
          <Card className="border-dashed" data-testid="no-audit-placeholder">
            <CardContent className="flex h-full items-center justify-center py-12">
              <p className="text-sm text-muted-foreground text-center">
                Você não tem permissão para visualizar o audit log.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Analytics charts ────────────────────────────────────────────────── */}
      <Separator />
      <DashboardSection title="Análise">
        {analyticsLoading && (
          <div className="grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[220px] w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {analyticsError && (
          <ErrorState description="Erro ao carregar dados de análise." />
        )}

        {!analyticsLoading && !analyticsError && analyticsData && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Tasks por semana */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tarefas por semana
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TasksByWeekChart data={analyticsData.tasksByWeek} />
              </CardContent>
            </Card>

            {/* Tasks por membro */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Top membros
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {analyticsData.tasksByMember.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    Nenhum dado disponível.
                  </div>
                ) : (
                  <TasksByMemberChart data={analyticsData.tasksByMember} />
                )}
              </CardContent>
            </Card>

            {/* Tasks por prioridade */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Por prioridade
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TasksByPriorityChart data={analyticsData.tasksByPriority} />
              </CardContent>
            </Card>
          </div>
        )}
      </DashboardSection>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      {hasQuickActions && (
        <>
          <Separator />
          <DashboardSection title="Ações rápidas">
            <div className="flex flex-wrap gap-2">
              {canCreateProject && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/org/${orgSlug}/projects`}>
                    <FolderKanban className="size-4" />
                    Novo Projeto
                  </Link>
                </Button>
              )}
              {canCreateTask && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/org/${orgSlug}/projects`}>
                    <CheckSquare className="size-4" />
                    Nova Tarefa
                  </Link>
                </Button>
              )}
              {canInvite && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/org/${orgSlug}/team`}>
                    <UserPlus className="size-4" />
                    Convidar membro
                  </Link>
                </Button>
              )}
              {canAudit && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/org/${orgSlug}/audit`}>
                    <ShieldCheck className="size-4" />
                    Ver Audit Log
                  </Link>
                </Button>
              )}
            </div>
          </DashboardSection>
        </>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  Plus,
  FolderKanban,
  CheckSquare,
  Users,
  UserPlus,
  ShieldCheck,
  ArrowUpRight,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TaskListItem } from "./task-list-item";
import { ActivityItem } from "./activity-item";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { useMyOpenTasks } from "@/features/dashboard/hooks/use-my-open-tasks";
import { useRecentActivity } from "@/features/dashboard/hooks/use-recent-activity";
import { useAnalytics } from "@/features/dashboard/hooks/use-analytics";
import { TasksByWeekChart } from "./charts/tasks-by-week-chart";
import { TasksByMemberChart } from "./charts/tasks-by-member-chart";
import { TasksByPriorityChart } from "./charts/tasks-by-priority-chart";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  textPrimary: "#efefef",
  textSecondary: "#9a9a9a",
  textMuted: "#5a5a5a",
  textVeryMuted: "#3a3a3a",
  cardBg: "rgba(255,255,255,0.018)",
  cardBorder: "rgba(255,255,255,0.06)",
  cardRadius: 10,
  success: "#9cc8a4",
  font: "'Space Grotesk',sans-serif",
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Dark panel card with title row + body */
function Panel({
  title,
  action,
  children,
  "data-testid": testId,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: T.cardRadius,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.textPrimary,
            letterSpacing: "-0.005em",
            fontFamily: T.font,
          }}
        >
          {title}
        </h3>
        {action}
      </div>
      {/* body */}
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

/** Dark KPI card matching the design */
function KpiCard({
  label,
  value,
  delta,
  deltaDir = "up",
  isLoading,
  "data-testid": testId,
}: {
  label: string;
  value?: number;
  delta?: string;
  deltaDir?: "up" | "down";
  isLoading?: boolean;
  "data-testid"?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{
        padding: "20px 22px",
        background: "rgba(255,255,255,0.022)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: T.textMuted,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: T.font,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {isLoading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: T.textPrimary,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              fontFamily: T.font,
            }}
          >
            {value ?? "—"}
          </div>
        )}
        {delta && !isLoading && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: deltaDir === "down" ? "#bbb" : T.success,
              fontFamily: T.font,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <ArrowUpRight style={{ width: 10, height: 10 }} />
            {delta}
          </div>
        )}
      </div>
    </div>
  );
}

/** Section divider with label */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 16,
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: T.textMuted,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: T.font,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "rgba(255,255,255,0.05)",
        }}
      />
    </div>
  );
}

/** Page header matching the design */
function AppPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        paddingBottom: 24,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        marginBottom: 28,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: T.textPrimary,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            fontFamily: T.font,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: T.textSecondary,
              fontFamily: T.font,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

/** Primary button (white) */
function PrimaryBtn({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "10px 16px",
        background: "#f0f0f0",
        border: "none",
        borderRadius: 7,
        color: "#080808",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: T.font,
        textDecoration: "none",
        letterSpacing: "0.015em",
        transition: "background 0.15s",
      }}
    >
      {icon}
      {children}
    </Link>
  );
}

/** Ghost button (outline) */
function GhostBtn({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 14px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 7,
        color: "#9a9a9a",
        fontSize: 12.5,
        fontWeight: 500,
        fontFamily: T.font,
        textDecoration: "none",
        transition: "all 0.15s",
      }}
    >
      {icon}
      {children}
    </Link>
  );
}

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function TaskSkeletons() {
  return (
    <div style={{ padding: "4px 20px 14px" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "13px 4px",
            borderBottom: "1px solid rgba(255,255,255,0.045)",
          }}
        >
          <Skeleton
            className="size-4 rounded-full"
            style={{ flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <Skeleton className="h-3.5 w-48 mb-1.5" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ActivitySkeletons() {
  return (
    <div style={{ padding: "4px 20px 14px" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "10px 4px",
          }}
        >
          <Skeleton className="size-6 rounded-full flex-shrink-0" />
          <div style={{ flex: 1 }}>
            <Skeleton className="h-3.5 w-40 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeletons() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
      }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: T.cardBg,
            border: `1px solid ${T.cardBorder}`,
            borderRadius: T.cardRadius,
            padding: "16px 20px",
          }}
        >
          <Skeleton className="h-3.5 w-28 mb-4" />
          <Skeleton className="h-52 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DashboardClientProps {
  orgSlug: string;
  orgName: string;
  role: string;
  membersCount: number;
  canAudit: boolean;
  canCreateProject: boolean;
  canCreateTask: boolean;
  canInvite: boolean;
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
  const {
    summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useDashboardSummary(orgSlug);

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
  const roleLabel =
    role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }} data-testid="dashboard-client">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <AppPageHeader
        title="Dashboard"
        subtitle={`${orgName} · ${roleLabel}`}
        actions={
          <>
            {canCreateProject && (
              <GhostBtn
                href={`/org/${orgSlug}/projects`}
                icon={<FolderKanban style={{ width: 13, height: 13 }} />}
              >
                Projetos
              </GhostBtn>
            )}
            {canCreateTask && (
              <PrimaryBtn
                href={`/org/${orgSlug}/projects`}
                icon={<Plus style={{ width: 13, height: 13, strokeWidth: 2 }} />}
              >
                Nova tarefa
              </PrimaryBtn>
            )}
          </>
        }
      />

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
        data-testid="kpi-grid"
      >
        <KpiCard
          label="Projetos ativos"
          value={summary?.projectsTotal}
          isLoading={summaryLoading}
          data-testid="kpi-projects"
        />
        <KpiCard
          label="Tarefas abertas"
          value={summary?.openTasksTotal}
          isLoading={summaryLoading}
          delta={summary?.openTasksTotal != null ? "TODO + Em andamento" : undefined}
          deltaDir="down"
          data-testid="kpi-open-tasks"
        />
        <KpiCard
          label="Concluídas esta semana"
          value={summary?.doneThisWeekTotal}
          isLoading={summaryLoading}
          data-testid="kpi-done-week"
        />
        <KpiCard
          label="Membros"
          value={membersCount}
          data-testid="kpi-members"
        />
      </div>

      {/* ── KPI error ────────────────────────────────────────────────────── */}
      {summaryError && (
        <ErrorState description="Erro ao carregar métricas. Tente novamente." />
      )}

      {/* ── My Tasks + Activity ──────────────────────────────────────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16 }}
      >
        {/* My Tasks */}
        <Panel
          data-testid="my-work-section"
          title="Minhas tarefas"
          action={
            <Link
              href={`/org/${orgSlug}/projects`}
              style={{
                fontSize: 12,
                color: T.textMuted,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontFamily: T.font,
              }}
            >
              Ver todas <ArrowUpRight style={{ width: 10, height: 10 }} />
            </Link>
          }
        >
          {openTasksLoading && <TaskSkeletons />}

          {openTasksError && (
            <div style={{ padding: "12px 20px" }}>
              <ErrorState
                description={openTasksErr?.message ?? "Erro ao carregar tarefas"}
                onRetry={() => void refetchOpenTasks()}
              />
            </div>
          )}

          {!openTasksLoading && !openTasksError && openTasks.length === 0 && (
            <div style={{ padding: "28px 20px" }}>
              <EmptyState
                icon={CheckSquare}
                title="Sem tarefas abertas"
                subtitle="Nenhuma tarefa em aberto nesta organização."
              />
            </div>
          )}

          {!openTasksLoading && !openTasksError && openTasks.length > 0 && (
            <div style={{ padding: "4px 20px 14px" }}>
              {openTasks.map((task) => (
                <TaskListItem key={task.id} task={task} orgSlug={orgSlug} />
              ))}
            </div>
          )}
        </Panel>

        {/* Recent Activity */}
        <Panel
          data-testid={canAudit ? "recent-activity-section" : "no-audit-placeholder"}
          title="Atividade recente"
          action={
            canAudit ? (
              <span
                style={{
                  fontSize: 10,
                  color: T.textMuted,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: T.font,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#7aa380",
                    display: "inline-block",
                  }}
                />
                Ao vivo
              </span>
            ) : undefined
          }
        >
          {activityLoading && <ActivitySkeletons />}

          {activityError && (
            <div style={{ padding: "12px 20px" }}>
              <ErrorState
                description={activityErr?.message ?? "Erro ao carregar atividade"}
                onRetry={() => void refetchActivity()}
              />
            </div>
          )}

          {!activityLoading && !activityError && activityLogs.length === 0 && (
            <div style={{ padding: "28px 20px" }}>
              <EmptyState
                icon={ShieldCheck}
                title="Sem atividade recente"
                subtitle={
                  canAudit
                    ? "Nenhuma ação registrada nos últimos 7 dias."
                    : "Sem permissão para visualizar o audit log."
                }
              />
            </div>
          )}

          {!activityLoading && !activityError && activityLogs.length > 0 && (
            <div style={{ padding: "4px 20px 14px" }}>
              {activityLogs.map((log) => (
                <ActivityItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Analytics ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Análise</SectionLabel>
        {analyticsLoading && <ChartSkeletons />}
        {analyticsError && (
          <ErrorState description="Erro ao carregar dados de análise." />
        )}
        {!analyticsLoading && !analyticsError && analyticsData && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {/* Tarefas por semana */}
            <div
              style={{
                background: T.cardBg,
                border: `1px solid ${T.cardBorder}`,
                borderRadius: T.cardRadius,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TrendingUp style={{ width: 13, height: 13, color: T.textMuted }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: T.textSecondary,
                    fontFamily: T.font,
                  }}
                >
                  Tarefas por semana
                </span>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <TasksByWeekChart data={analyticsData.tasksByWeek} />
              </div>
            </div>

            {/* Top membros */}
            <div
              style={{
                background: T.cardBg,
                border: `1px solid ${T.cardBorder}`,
                borderRadius: T.cardRadius,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Users style={{ width: 13, height: 13, color: T.textMuted }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: T.textSecondary,
                    fontFamily: T.font,
                  }}
                >
                  Top membros
                </span>
              </div>
              <div style={{ padding: "16px 20px" }}>
                {analyticsData.tasksByMember.length === 0 ? (
                  <div
                    style={{
                      height: 180,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: T.textMuted,
                      fontFamily: T.font,
                    }}
                  >
                    Nenhum dado disponível
                  </div>
                ) : (
                  <TasksByMemberChart data={analyticsData.tasksByMember} />
                )}
              </div>
            </div>

            {/* Por prioridade */}
            <div
              style={{
                background: T.cardBg,
                border: `1px solid ${T.cardBorder}`,
                borderRadius: T.cardRadius,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FolderKanban style={{ width: 13, height: 13, color: T.textMuted }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: T.textSecondary,
                    fontFamily: T.font,
                  }}
                >
                  Por prioridade
                </span>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <TasksByPriorityChart data={analyticsData.tasksByPriority} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      {(canCreateProject || canCreateTask || canInvite || canAudit) && (
        <div>
          <SectionLabel>Ações rápidas</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {canCreateProject && (
              <GhostBtn
                href={`/org/${orgSlug}/projects`}
                icon={<FolderKanban style={{ width: 14, height: 14 }} />}
              >
                Novo Projeto
              </GhostBtn>
            )}
            {canCreateTask && (
              <GhostBtn
                href={`/org/${orgSlug}/projects`}
                icon={<CheckSquare style={{ width: 14, height: 14 }} />}
              >
                Nova Tarefa
              </GhostBtn>
            )}
            {canInvite && (
              <GhostBtn
                href={`/org/${orgSlug}/team`}
                icon={<UserPlus style={{ width: 14, height: 14 }} />}
              >
                Convidar membro
              </GhostBtn>
            )}
            {canAudit && (
              <GhostBtn
                href={`/org/${orgSlug}/audit`}
                icon={<ShieldCheck style={{ width: 14, height: 14 }} />}
              >
                Ver Audit Log
              </GhostBtn>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

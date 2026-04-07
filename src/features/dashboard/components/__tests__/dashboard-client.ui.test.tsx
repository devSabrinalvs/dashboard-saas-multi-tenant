/**
 * UI tests para DashboardClient (RTL).
 * Usa mocks de módulo dos hooks para evitar dependências de rede/DB.
 *
 * Como rodar: pnpm test:ui
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardClient } from "../dashboard-client";

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
  usePathname: jest.fn(() => "/org/test-org/dashboard"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

jest.mock("@/features/dashboard/hooks/use-dashboard-summary");
jest.mock("@/features/dashboard/hooks/use-my-open-tasks");
jest.mock("@/features/dashboard/hooks/use-recent-activity");

import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { useMyOpenTasks } from "@/features/dashboard/hooks/use-my-open-tasks";
import { useRecentActivity } from "@/features/dashboard/hooks/use-recent-activity";

const mockUseSummary = useDashboardSummary as jest.MockedFunction<typeof useDashboardSummary>;
const mockUseOpenTasks = useMyOpenTasks as jest.MockedFunction<typeof useMyOpenTasks>;
const mockUseActivity = useRecentActivity as jest.MockedFunction<typeof useRecentActivity>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_SUMMARY = {
  projectsTotal: 5,
  openTasksTotal: 12,
  doneThisWeekTotal: 3,
};

const MOCK_TASK = {
  id: "task-1",
  orgId: "org-1",
  projectId: "proj-1",
  title: "Revisar PRs",
  description: null,
  status: "IN_PROGRESS" as const,
  tags: ["frontend"],
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-15"),
};

const MOCK_LOG = {
  id: "log-1",
  action: "project.created",
  createdAt: new Date("2024-01-15"),
  metadata: null,
  actor: { id: "user-1", email: "admin@acme.com" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

interface Props {
  canAudit?: boolean;
  canCreateProject?: boolean;
  canCreateTask?: boolean;
  canInvite?: boolean;
  membersCount?: number;
}

function renderDashboard({
  canAudit = true,
  canCreateProject = true,
  canCreateTask = true,
  canInvite = true,
  membersCount = 4,
}: Props = {}) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <DashboardClient
        orgSlug="test-org"
        orgName="Acme Corp"
        role="OWNER"
        membersCount={membersCount}
        canAudit={canAudit}
        canCreateProject={canCreateProject}
        canCreateTask={canCreateTask}
        canInvite={canInvite}
      />
    </QueryClientProvider>
  );
}

function mockAllLoaded() {
  mockUseSummary.mockReturnValue({
    summary: MOCK_SUMMARY,
    isLoading: false,
    isError: false,
    errors: [],
  });
  mockUseOpenTasks.mockReturnValue({
    data: { items: [MOCK_TASK], total: 1, page: 1, pageSize: 10, totalPages: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    status: "success",
    fetchStatus: "idle",
  } as unknown as ReturnType<typeof useMyOpenTasks>);
  mockUseActivity.mockReturnValue({
    data: { items: [MOCK_LOG], total: 1, page: 1, pageSize: 10, totalPages: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    status: "success",
    fetchStatus: "idle",
  } as unknown as ReturnType<typeof useRecentActivity>);
}

function mockAllLoading() {
  mockUseSummary.mockReturnValue({
    summary: undefined,
    isLoading: true,
    isError: false,
    errors: [],
  });
  mockUseOpenTasks.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
    status: "pending",
    fetchStatus: "fetching",
  } as unknown as ReturnType<typeof useMyOpenTasks>);
  mockUseActivity.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
    status: "pending",
    fetchStatus: "fetching",
  } as unknown as ReturnType<typeof useRecentActivity>);
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("DashboardClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Renderização geral ────────────────────────────────────────────────────

  it("renderiza o container principal", () => {
    mockAllLoaded();
    renderDashboard();
    expect(screen.getByTestId("dashboard-client")).toBeInTheDocument();
  });

  it("exibe o título 'Dashboard'", () => {
    mockAllLoaded();
    renderDashboard();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  // ── KPI cards ─────────────────────────────────────────────────────────────

  it("exibe os 4 KPI cards", () => {
    mockAllLoaded();
    renderDashboard();
    expect(screen.getByTestId("kpi-projects")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-open-tasks")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-done-week")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-members")).toBeInTheDocument();
  });

  it("exibe os valores corretos nos KPI cards quando dados carregados", () => {
    mockAllLoaded();
    renderDashboard({ membersCount: 4 });

    expect(screen.getByTestId("kpi-projects")).toHaveTextContent("5");
    expect(screen.getByTestId("kpi-open-tasks")).toHaveTextContent("12");
    expect(screen.getByTestId("kpi-done-week")).toHaveTextContent("3");
    expect(screen.getByTestId("kpi-members")).toHaveTextContent("4");
  });

  it("exibe skeletons nos KPI cards enquanto carrega", () => {
    mockAllLoading();
    renderDashboard();

    // Skeletons existem — não há valores numéricos
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
  });

  // ── My Work ───────────────────────────────────────────────────────────────

  it("exibe seção 'Minhas tarefas' com task carregada", () => {
    mockAllLoaded();
    renderDashboard();
    expect(screen.getByTestId("my-work-section")).toBeInTheDocument();
    expect(screen.getByText(MOCK_TASK.title)).toBeInTheDocument();
  });

  it("exibe empty state quando não há tasks abertas", () => {
    mockUseSummary.mockReturnValue({ summary: MOCK_SUMMARY, isLoading: false, isError: false, errors: [] });
    mockUseOpenTasks.mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
      isLoading: false, isError: false, error: null,
      refetch: jest.fn(), status: "success", fetchStatus: "idle",
    } as unknown as ReturnType<typeof useMyOpenTasks>);
    mockUseActivity.mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
      isLoading: false, isError: false, error: null,
      refetch: jest.fn(), status: "success", fetchStatus: "idle",
    } as unknown as ReturnType<typeof useRecentActivity>);

    renderDashboard();
    expect(screen.getByText("Sem tarefas abertas")).toBeInTheDocument();
  });

  // ── Recent Activity ───────────────────────────────────────────────────────

  it("exibe seção 'Atividade recente' quando canAudit=true", () => {
    mockAllLoaded();
    renderDashboard({ canAudit: true });
    expect(screen.getByTestId("recent-activity-section")).toBeInTheDocument();
    // "project.created" → "Criou um projeto"
    expect(screen.getByText("Criou um projeto")).toBeInTheDocument();
  });

  it("NÃO exibe seção 'Atividade recente' quando canAudit=false", () => {
    mockAllLoaded();
    // useRecentActivity com enabled=false não busca dados — retorna loading/undefined
    mockUseActivity.mockReturnValue({
      data: undefined,
      isLoading: false, isError: false, error: null,
      refetch: jest.fn(), status: "pending", fetchStatus: "idle",
    } as unknown as ReturnType<typeof useRecentActivity>);

    renderDashboard({ canAudit: false });

    expect(screen.queryByTestId("recent-activity-section")).not.toBeInTheDocument();
    // Mostra o placeholder de "sem permissão"
    expect(screen.getByTestId("no-audit-placeholder")).toBeInTheDocument();
  });

  it("NÃO chama useRecentActivity quando canAudit=false", () => {
    mockAllLoaded();
    mockUseActivity.mockReturnValue({
      data: undefined, isLoading: false, isError: false, error: null,
      refetch: jest.fn(), status: "pending", fetchStatus: "idle",
    } as unknown as ReturnType<typeof useRecentActivity>);

    renderDashboard({ canAudit: false });

    // O hook é chamado com enabled=false — a query não é executada
    expect(mockUseActivity).toHaveBeenCalledWith("test-org", false);
  });

  // ── Quick actions ─────────────────────────────────────────────────────────

  it("exibe ações rápidas quando o usuário tem permissão", () => {
    mockAllLoaded();
    renderDashboard({ canCreateProject: true, canInvite: true });
    // "Novo Projeto" aparece tanto no header quanto nas quick actions
    expect(screen.getAllByText("Novo Projeto").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Convidar membro")).toBeInTheDocument();
  });

  it("não exibe botão Convidar quando canInvite=false", () => {
    mockAllLoaded();
    renderDashboard({ canInvite: false, canCreateProject: true });
    expect(screen.queryByText("Convidar membro")).not.toBeInTheDocument();
  });
});

/**
 * Testes de UI para o toggle Lista/Kanban no TasksSection.
 *
 * KanbanBoard é mockado para isolar o teste do toggle puro.
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/org/test-org/projects/proj-1"),
}));

jest.mock("@/features/tasks/hooks/use-tasks");
jest.mock("@/features/tasks/hooks/use-bulk-task-action");
jest.mock("@/features/tasks/hooks/use-update-task-optimistic");
jest.mock("@/features/tasks/hooks/use-saved-filters");
jest.mock("@/features/tasks/components/task-form-modal", () => ({
  TaskFormModal: () => null,
}));
jest.mock("@/features/tasks/components/saved-filters-menu", () => ({
  SavedFiltersMenu: () => <div data-testid="saved-filters-menu" />,
}));
// KanbanBoard mockado para isolação
jest.mock("@/features/tasks/components/kanban/kanban-board", () => ({
  KanbanBoard: () => <div data-testid="kanban-board-mock" />,
}));

import { TasksSection } from "../tasks-section";
import { useTasks } from "@/features/tasks/hooks/use-tasks";
import { useBulkTaskAction } from "@/features/tasks/hooks/use-bulk-task-action";
import { useUpdateTaskOptimistic } from "@/features/tasks/hooks/use-update-task-optimistic";
import { useSavedFilters } from "@/features/tasks/hooks/use-saved-filters";

const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseBulk = useBulkTaskAction as jest.MockedFunction<
  typeof useBulkTaskAction
>;
const mockUseUpdateOptimistic = useUpdateTaskOptimistic as jest.MockedFunction<
  typeof useUpdateTaskOptimistic
>;
const mockUseSavedFilters = useSavedFilters as jest.MockedFunction<
  typeof useSavedFilters
>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TASK_1 = {
  id: "task-1",
  orgId: "org-1",
  projectId: "proj-1",
  title: "Revisar código",
  description: null,
  status: "TODO" as const,
  tags: [],
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
};

const TASK_2 = {
  id: "task-2",
  orgId: "org-1",
  projectId: "proj-1",
  title: "Escrever testes",
  description: null,
  status: "IN_PROGRESS" as const,
  tags: [],
  createdAt: new Date("2024-01-11"),
  updatedAt: new Date("2024-01-11"),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeMutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    data: undefined,
    error: null,
    variables: undefined,
    reset: jest.fn(),
    context: undefined,
    status: "idle" as const,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    ...overrides,
  };
}

function mockDeps() {
  mockUseTasks.mockReturnValue({
    data: {
      items: [TASK_1, TASK_2],
      total: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    },
    isLoading: false,
    isError: false,
    error: null,
    status: "success",
    fetchStatus: "idle",
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useTasks>);

  mockUseBulk.mockReturnValue(
    makeMutation() as unknown as ReturnType<typeof useBulkTaskAction>
  );
  mockUseUpdateOptimistic.mockReturnValue(
    makeMutation() as unknown as ReturnType<typeof useUpdateTaskOptimistic>
  );
  mockUseSavedFilters.mockReturnValue({
    savedFilters: [],
    saveFilter: jest.fn(),
    removeFilter: jest.fn(),
    setDefault: jest.fn(),
    getDefault: jest.fn().mockReturnValue(null),
  });
}

function renderSection(
  props: { canCreate?: boolean; canUpdate?: boolean; canDelete?: boolean } = {}
) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TasksSection
        orgSlug="test-org"
        projectId="proj-1"
        canCreate={props.canCreate ?? true}
        canUpdate={props.canUpdate ?? true}
        canDelete={props.canDelete ?? true}
        currentUserId="user-1"
      />
    </QueryClientProvider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TasksSection — view toggle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockDeps();
  });

  it("exibe os botões de toggle Lista e Kanban", () => {
    renderSection();
    expect(screen.getByTestId("view-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("view-toggle-list")).toBeInTheDocument();
    expect(screen.getByTestId("view-toggle-kanban")).toBeInTheDocument();
  });

  it("modo lista é o padrão (sem localStorage)", () => {
    renderSection();
    expect(screen.getByTestId("tasks-table")).toBeInTheDocument();
    expect(screen.queryByTestId("kanban-board-mock")).not.toBeInTheDocument();
  });

  it("clicar em Kanban exibe KanbanBoard e oculta tabela", () => {
    renderSection();
    fireEvent.click(screen.getByTestId("view-toggle-kanban"));
    expect(screen.getByTestId("kanban-board-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("tasks-table")).not.toBeInTheDocument();
  });

  it("clicar em Lista depois de Kanban restaura a tabela", () => {
    renderSection();
    fireEvent.click(screen.getByTestId("view-toggle-kanban"));
    fireEvent.click(screen.getByTestId("view-toggle-list"));
    expect(screen.getByTestId("tasks-table")).toBeInTheDocument();
    expect(screen.queryByTestId("kanban-board-mock")).not.toBeInTheDocument();
  });

  it("persiste escolha 'kanban' em localStorage", () => {
    renderSection();
    fireEvent.click(screen.getByTestId("view-toggle-kanban"));
    expect(localStorage.getItem("kanban-view:test-org:proj-1")).toBe("kanban");
  });

  it("persiste escolha 'list' em localStorage", () => {
    localStorage.setItem("kanban-view:test-org:proj-1", "kanban");
    renderSection();
    fireEvent.click(screen.getByTestId("view-toggle-list"));
    expect(localStorage.getItem("kanban-view:test-org:proj-1")).toBe("list");
  });

  it("filtros da lista NÃO aparecem no modo Kanban", () => {
    renderSection();
    fireEvent.click(screen.getByTestId("view-toggle-kanban"));
    expect(screen.queryByTestId("task-search-input")).not.toBeInTheDocument();
  });

  it("filtros aparecem no modo Lista", () => {
    renderSection();
    expect(screen.getByTestId("task-search-input")).toBeInTheDocument();
  });
});

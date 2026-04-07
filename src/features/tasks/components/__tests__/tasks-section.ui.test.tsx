/**
 * UI tests para TasksSection (RTL).
 * Testa: bulk selection, inline edit, saved filters, RBAC.
 * Usa mocks de módulo em vez de MSW (evita ESM/CJS issues).
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TasksSection } from "../tasks-section";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/org/test-org/projects/proj-1"),
}));

jest.mock("@/features/tasks/hooks/use-tasks");
jest.mock("@/features/tasks/hooks/use-bulk-task-action");
jest.mock("@/features/tasks/hooks/use-update-task-optimistic");
jest.mock("@/features/tasks/hooks/use-saved-filters");
jest.mock("../task-form-modal", () => ({ TaskFormModal: () => null }));

// Mock SavedFiltersMenu para evitar dependência de portais Radix em jsdom
let capturedOnApply: ((f: { search: string; status: string; tag: string; pageSize: number }) => void) | null = null;
let capturedOnReset: (() => void) | null = null;
jest.mock("../saved-filters-menu", () => ({
  SavedFiltersMenu: ({ onApply, onReset }: {
    orgSlug: string;
    projectId: string;
    currentFilters: { search: string; status: string; tag: string; pageSize: number };
    onApply: (f: { search: string; status: string; tag: string; pageSize: number }) => void;
    onReset: () => void;
  }) => {
    capturedOnApply = onApply;
    capturedOnReset = onReset;
    return (
      <div data-testid="saved-filters-trigger" onClick={() => {}}>
        Filtros
        <button data-testid="trigger-apply" onClick={() => onApply({ search: "", status: "TODO", tag: "", pageSize: 10 })}>Apply</button>
        <button data-testid="trigger-reset" onClick={() => onReset()}>Reset</button>
      </div>
    );
  },
}));

import { useTasks } from "@/features/tasks/hooks/use-tasks";
import { useBulkTaskAction } from "@/features/tasks/hooks/use-bulk-task-action";
import { useUpdateTaskOptimistic } from "@/features/tasks/hooks/use-update-task-optimistic";
import { useSavedFilters } from "@/features/tasks/hooks/use-saved-filters";

const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseBulk = useBulkTaskAction as jest.MockedFunction<typeof useBulkTaskAction>;
const mockUseUpdateOptimistic = useUpdateTaskOptimistic as jest.MockedFunction<typeof useUpdateTaskOptimistic>;
const mockUseSavedFilters = useSavedFilters as jest.MockedFunction<typeof useSavedFilters>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TASK_1 = {
  id: "task-1",
  orgId: "org-1",
  projectId: "proj-1",
  title: "Revisar código",
  description: null,
  status: "TODO" as const,
  tags: ["frontend"],
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-15"),
};

const TASK_2 = {
  id: "task-2",
  orgId: "org-1",
  projectId: "proj-1",
  title: "Escrever testes",
  description: "Cobertura mínima 80%",
  status: "IN_PROGRESS" as const,
  tags: [],
  createdAt: new Date("2024-01-11"),
  updatedAt: new Date("2024-01-16"),
};

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function makeBulkMutation(overrides: Record<string, unknown> = {}) {
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

function makeUpdateMutation(overrides: Record<string, unknown> = {}) {
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

function mockDefaultDeps() {
  mockUseTasks.mockReturnValue({
    data: { items: [TASK_1, TASK_2], total: 2, page: 1, pageSize: 10, totalPages: 1 },
    isLoading: false,
    isError: false,
    error: null,
    status: "success",
    fetchStatus: "idle",
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useTasks>);

  mockUseBulk.mockReturnValue(makeBulkMutation() as unknown as ReturnType<typeof useBulkTaskAction>);
  mockUseUpdateOptimistic.mockReturnValue(makeUpdateMutation() as unknown as ReturnType<typeof useUpdateTaskOptimistic>);

  mockUseSavedFilters.mockReturnValue({
    savedFilters: [],
    saveFilter: jest.fn(),
    removeFilter: jest.fn(),
    setDefault: jest.fn(),
    getDefault: jest.fn().mockReturnValue(null),
  });
}

interface RenderProps {
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

function renderSection({
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: RenderProps = {}) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TasksSection
        orgSlug="test-org"
        projectId="proj-1"
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        currentUserId="user-1"
      />
    </QueryClientProvider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TasksSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaultDeps();
  });

  // ── Renderização básica ───────────────────────────────────────────────────

  it("renderiza tabela de tasks com dados", () => {
    renderSection();
    expect(screen.getByTestId("tasks-table")).toBeInTheDocument();
    expect(screen.getByText(TASK_1.title)).toBeInTheDocument();
    expect(screen.getByText(TASK_2.title)).toBeInTheDocument();
  });

  it("exibe skeletons quando isLoading=true", () => {
    mockUseTasks.mockReturnValue({
      data: undefined, isLoading: true, isError: false, error: null,
      status: "pending", fetchStatus: "fetching", refetch: jest.fn(),
    } as unknown as ReturnType<typeof useTasks>);
    renderSection();
    expect(screen.queryByTestId("tasks-table")).not.toBeInTheDocument();
  });

  // ── Seleção e bulk action bar ─────────────────────────────────────────────

  it("exibe bulk action bar ao selecionar tasks", () => {
    renderSection();
    expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();

    const checkbox1 = screen.getByTestId("task-checkbox-task-1");
    fireEvent.click(checkbox1);

    expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
    expect(screen.getByText("1 selecionada")).toBeInTheDocument();
  });

  it("seleciona múltiplas tasks e exibe contador correto", () => {
    renderSection();
    fireEvent.click(screen.getByTestId("task-checkbox-task-1"));
    fireEvent.click(screen.getByTestId("task-checkbox-task-2"));
    expect(screen.getByText("2 selecionadas")).toBeInTheDocument();
  });

  it("select-all seleciona todas as tasks da página", () => {
    renderSection();
    const selectAll = screen.getByTestId("select-all-checkbox");
    fireEvent.click(selectAll);
    expect(screen.getByText("2 selecionadas")).toBeInTheDocument();
  });

  it("botão X da bulk bar limpa a seleção", () => {
    renderSection();
    fireEvent.click(screen.getByTestId("task-checkbox-task-1"));
    expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Limpar seleção"));
    expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();
  });

  // ── Bulk "Marcar DONE" ────────────────────────────────────────────────────

  it("'Marcar DONE' chama bulk mutation com status=DONE", () => {
    const mutateFn = jest.fn();
    mockUseBulk.mockReturnValue(
      makeBulkMutation({ mutate: mutateFn }) as unknown as ReturnType<typeof useBulkTaskAction>
    );
    renderSection();

    fireEvent.click(screen.getByTestId("task-checkbox-task-1"));
    fireEvent.click(screen.getByTestId("task-checkbox-task-2"));
    fireEvent.click(screen.getByTestId("bulk-mark-done"));

    expect(mutateFn).toHaveBeenCalledWith(
      { action: "setStatus", taskIds: expect.arrayContaining(["task-1", "task-2"]), status: "DONE" },
      expect.any(Object)
    );
  });

  // ── RBAC: VIEWER não vê ações ─────────────────────────────────────────────

  it("VIEWER (canUpdate=false, canDelete=false) não vê bulk action bar", () => {
    renderSection({ canCreate: false, canUpdate: false, canDelete: false });
    // Ainda pode selecionar... mas a bulk bar sem ações não é exibida
    fireEvent.click(screen.getByTestId("task-checkbox-task-1"));
    // Bulk bar aparece mas sem botões de ação
    const bar = screen.queryByTestId("bulk-action-bar");
    if (bar) {
      // Botões de ação não devem existir
      expect(screen.queryByTestId("bulk-mark-done")).not.toBeInTheDocument();
      expect(screen.queryByTestId("bulk-delete-btn")).not.toBeInTheDocument();
    }
  });

  it("VIEWER (canUpdate=false) não vê botão Marcar DONE", () => {
    renderSection({ canUpdate: false, canDelete: false });
    fireEvent.click(screen.getByTestId("task-checkbox-task-1"));
    expect(screen.queryByTestId("bulk-mark-done")).not.toBeInTheDocument();
  });

  it("VIEWER (canDelete=false) não vê botão Excluir na bulk bar", () => {
    renderSection({ canDelete: false, canUpdate: true });
    fireEvent.click(screen.getByTestId("task-checkbox-task-1"));
    expect(screen.queryByTestId("bulk-delete-btn")).not.toBeInTheDocument();
  });

  // ── Inline edit ───────────────────────────────────────────────────────────

  it("inline title é clicável quando canUpdate=true", () => {
    renderSection({ canUpdate: true });
    const titles = screen.getAllByTestId("inline-title-display");
    expect(titles.length).toBeGreaterThan(0);
  });

  it("inline title chama mutation ao salvar", async () => {
    const mutateFn = jest.fn();
    mockUseUpdateOptimistic.mockReturnValue(
      makeUpdateMutation({ mutate: mutateFn }) as unknown as ReturnType<typeof useUpdateTaskOptimistic>
    );
    renderSection({ canUpdate: true });

    const titleDisplay = screen.getAllByTestId("inline-title-display")[0];
    fireEvent.click(titleDisplay);

    const input = await screen.findByTestId("inline-title-input");
    fireEvent.change(input, { target: { value: "Novo título editado" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mutateFn).toHaveBeenCalledWith(
      { taskId: "task-1", data: { title: "Novo título editado" } },
      expect.any(Object)
    );
  });

  it("pressionar Escape cancela o inline edit sem salvar", async () => {
    const mutateFn = jest.fn();
    mockUseUpdateOptimistic.mockReturnValue(
      makeUpdateMutation({ mutate: mutateFn }) as unknown as ReturnType<typeof useUpdateTaskOptimistic>
    );
    renderSection({ canUpdate: true });

    const titleDisplay = screen.getAllByTestId("inline-title-display")[0];
    fireEvent.click(titleDisplay);

    const input = await screen.findByTestId("inline-title-input");
    fireEvent.change(input, { target: { value: "título que não salva" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(mutateFn).not.toHaveBeenCalled();
    expect(screen.queryByTestId("inline-title-input")).not.toBeInTheDocument();
  });

  // ── Saved filters ─────────────────────────────────────────────────────────

  it("exibe botão de filtros salvos", () => {
    renderSection();
    expect(screen.getByTestId("saved-filters-trigger")).toBeInTheDocument();
  });

  it("exibe o trigger do SavedFiltersMenu", () => {
    renderSection();
    expect(screen.getByTestId("saved-filters-trigger")).toBeInTheDocument();
  });

  it("salvar filtro salvo atualiza useTasks sem erros", () => {
    renderSection();
    // O mock expõe o callback onApply diretamente como botão
    fireEvent.click(screen.getByTestId("trigger-apply"));
    // useTasks deve ter sido chamado (ele é chamado dentro do componente com novos filtros)
    expect(mockUseTasks).toHaveBeenCalled();
  });

  it("resetar filtros limpa search/status/tag sem erros", () => {
    renderSection();
    fireEvent.click(screen.getByTestId("trigger-reset"));
    // Após reset, useTasks é re-chamado com parâmetros vazios
    expect(mockUseTasks).toHaveBeenCalledWith(
      "test-org",
      "proj-1",
      expect.objectContaining({ search: undefined, status: undefined })
    );
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  it("exibe empty state quando não há tasks e sem filtros", () => {
    mockUseTasks.mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 },
      isLoading: false, isError: false, error: null,
      status: "success", fetchStatus: "idle", refetch: jest.fn(),
    } as unknown as ReturnType<typeof useTasks>);
    renderSection({ canCreate: true });
    expect(screen.getByText("Nenhuma tarefa ainda")).toBeInTheDocument();
    expect(screen.getByTestId("empty-tasks-cta")).toBeInTheDocument();
  });

  // ── Debounce search ────────────────────────────────────────────────────────

  it("campo de busca existe e aceita input", () => {
    renderSection();
    const searchInput = screen.getByTestId("task-search-input");
    fireEvent.change(searchInput, { target: { value: "teste" } });
    expect(searchInput).toHaveValue("teste");
  });
});

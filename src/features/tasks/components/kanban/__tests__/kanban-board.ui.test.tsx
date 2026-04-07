/**
 * Testes de UI para KanbanBoard, KanbanColumn e KanbanQuickAdd (RTL).
 *
 * Estratégia:
 * - Mock do @dnd-kit/core: captura onDragEnd e permite chamada manual
 * - Mock dos hooks useKanbanTasks, useUpdateTaskOptimistic, useCreateTask
 * - Testa: renderização, drag simulado, quick add, RBAC (VIEWER)
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Types para o mock de DnD ─────────────────────────────────────────────────

type DragEndHandler = (event: {
  active: {
    id: string;
    data: { current: { task: { id: string; status: string; title: string } } };
  };
  over: { id: string } | null;
}) => void;

let capturedDragEnd: DragEndHandler | null = null;

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: DragEndHandler;
    onDragStart: () => void;
  }) => {
    capturedDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: () => null,
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  pointerWithin: jest.fn(),
  useDraggable: (_opts: { id: string; data: unknown; disabled: boolean }) => ({
    attributes: { role: "button" },
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: ({ id }: { id: string }) => ({
    setNodeRef: jest.fn(),
    isOver: false,
    id,
  }),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: { Translate: { toString: jest.fn(() => "") } },
}));

jest.mock("@/features/tasks/hooks/use-kanban-tasks");
jest.mock("@/features/tasks/hooks/use-update-task-optimistic");
jest.mock("@/features/tasks/hooks/use-create-task");
jest.mock("@/features/tasks/components/task-form-modal", () => ({
  TaskFormModal: () => null,
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/org/test-org/projects/proj-1"),
}));

import { KanbanBoard } from "../kanban-board";
import { useKanbanTasks } from "@/features/tasks/hooks/use-kanban-tasks";
import { useUpdateTaskOptimistic } from "@/features/tasks/hooks/use-update-task-optimistic";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";

const mockUseKanbanTasks = useKanbanTasks as jest.MockedFunction<
  typeof useKanbanTasks
>;
const mockUseUpdateOptimistic = useUpdateTaskOptimistic as jest.MockedFunction<
  typeof useUpdateTaskOptimistic
>;
const mockUseCreateTask = useCreateTask as jest.MockedFunction<
  typeof useCreateTask
>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TASK_TODO = {
  id: "task-todo-1",
  orgId: "org-1",
  projectId: "proj-1",
  title: "Implementar login",
  description: null,
  status: "TODO" as const,
  tags: ["auth", "frontend"],
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
};

const TASK_IN_PROGRESS = {
  id: "task-ip-1",
  orgId: "org-1",
  projectId: "proj-1",
  title: "Refatorar componentes",
  description: "Remover código duplicado",
  status: "IN_PROGRESS" as const,
  tags: [],
  createdAt: new Date("2024-01-11"),
  updatedAt: new Date("2024-01-11"),
};

const TASK_DONE = {
  id: "task-done-1",
  orgId: "org-1",
  projectId: "proj-1",
  title: "Setup CI/CD",
  description: null,
  status: "DONE" as const,
  tags: ["devops"],
  createdAt: new Date("2024-01-09"),
  updatedAt: new Date("2024-01-09"),
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

function makeKanbanData(overrides: Record<string, unknown> = {}) {
  return {
    columns: {
      TODO: [TASK_TODO],
      IN_PROGRESS: [TASK_IN_PROGRESS],
      DONE: [TASK_DONE],
      CANCELED: [],
    },
    isLoading: false,
    isError: false,
    error: null,
    data: undefined,
    status: "success" as const,
    fetchStatus: "idle" as const,
    refetch: jest.fn(),
    ...overrides,
  };
}

function mockDefaultDeps() {
  mockUseKanbanTasks.mockReturnValue(
    makeKanbanData() as unknown as ReturnType<typeof useKanbanTasks>
  );
  mockUseUpdateOptimistic.mockReturnValue(
    makeMutation() as unknown as ReturnType<typeof useUpdateTaskOptimistic>
  );
  mockUseCreateTask.mockReturnValue(
    makeMutation() as unknown as ReturnType<typeof useCreateTask>
  );
}

interface RenderProps {
  canCreate?: boolean;
  canUpdate?: boolean;
}

function renderBoard({ canCreate = true, canUpdate = true }: RenderProps = {}) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <KanbanBoard
        orgSlug="test-org"
        projectId="proj-1"
        canCreate={canCreate}
        canUpdate={canUpdate}
        currentUserId="user-1"
        assignedToMe={false}
        onAssignedToMeToggle={jest.fn()}
      />
    </QueryClientProvider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("KanbanBoard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedDragEnd = null;
    mockDefaultDeps();
  });

  // ── Renderização básica ───────────────────────────────────────────────────

  it("renderiza o board com 4 colunas", () => {
    renderBoard();
    expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-TODO")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-IN_PROGRESS")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-DONE")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-CANCELED")).toBeInTheDocument();
  });

  it("exibe os títulos das tasks nas colunas corretas", () => {
    renderBoard();
    expect(screen.getByText(TASK_TODO.title)).toBeInTheDocument();
    expect(screen.getByText(TASK_IN_PROGRESS.title)).toBeInTheDocument();
    expect(screen.getByText(TASK_DONE.title)).toBeInTheDocument();
  });

  it("exibe contador correto em cada coluna", () => {
    renderBoard();
    expect(
      screen.getByTestId("kanban-column-count-TODO")
    ).toHaveTextContent("1");
    expect(
      screen.getByTestId("kanban-column-count-IN_PROGRESS")
    ).toHaveTextContent("1");
    expect(
      screen.getByTestId("kanban-column-count-DONE")
    ).toHaveTextContent("1");
    expect(
      screen.getByTestId("kanban-column-count-CANCELED")
    ).toHaveTextContent("0");
  });

  it("exibe tags do card", () => {
    renderBoard();
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("devops")).toBeInTheDocument();
  });

  it("exibe skeleton enquanto isLoading=true", () => {
    mockUseKanbanTasks.mockReturnValue({
      ...makeKanbanData({ isLoading: true }),
    } as unknown as ReturnType<typeof useKanbanTasks>);
    renderBoard();
    expect(screen.getByTestId("kanban-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("kanban-board")).not.toBeInTheDocument();
  });

  it("exibe 'Nenhuma tarefa' em colunas vazias", () => {
    renderBoard();
    const canceledZone = screen.getByTestId("kanban-dropzone-CANCELED");
    expect(canceledZone).toHaveTextContent("Nenhuma tarefa");
  });

  it("exibe múltiplas tasks na mesma coluna", () => {
    const TASK_TODO_2 = {
      ...TASK_TODO,
      id: "task-todo-2",
      title: "Segunda tarefa TODO",
    };
    mockUseKanbanTasks.mockReturnValue({
      ...makeKanbanData(),
      columns: {
        TODO: [TASK_TODO, TASK_TODO_2],
        IN_PROGRESS: [],
        DONE: [],
        CANCELED: [],
      },
    } as unknown as ReturnType<typeof useKanbanTasks>);

    renderBoard();

    expect(screen.getByText(TASK_TODO.title)).toBeInTheDocument();
    expect(screen.getByText(TASK_TODO_2.title)).toBeInTheDocument();
    expect(
      screen.getByTestId("kanban-column-count-TODO")
    ).toHaveTextContent("2");
  });

  // ── Drag & drop ───────────────────────────────────────────────────────────

  it("drag TODO → IN_PROGRESS chama mutation com status correto", () => {
    const mutateFn = jest.fn();
    mockUseUpdateOptimistic.mockReturnValue(
      makeMutation({ mutate: mutateFn }) as unknown as ReturnType<
        typeof useUpdateTaskOptimistic
      >
    );
    renderBoard({ canUpdate: true });

    expect(capturedDragEnd).not.toBeNull();
    capturedDragEnd!({
      active: {
        id: TASK_TODO.id,
        data: { current: { task: TASK_TODO } },
      },
      over: { id: "IN_PROGRESS" },
    });

    expect(mutateFn).toHaveBeenCalledWith({
      taskId: TASK_TODO.id,
      data: { status: "IN_PROGRESS" },
    });
  });

  it("drag IN_PROGRESS → DONE chama mutation com status DONE", () => {
    const mutateFn = jest.fn();
    mockUseUpdateOptimistic.mockReturnValue(
      makeMutation({ mutate: mutateFn }) as unknown as ReturnType<
        typeof useUpdateTaskOptimistic
      >
    );
    renderBoard({ canUpdate: true });

    capturedDragEnd!({
      active: { id: TASK_IN_PROGRESS.id, data: { current: { task: TASK_IN_PROGRESS } } },
      over: { id: "DONE" },
    });

    expect(mutateFn).toHaveBeenCalledWith({
      taskId: TASK_IN_PROGRESS.id,
      data: { status: "DONE" },
    });
  });

  it("drag para mesma coluna NÃO chama mutation", () => {
    const mutateFn = jest.fn();
    mockUseUpdateOptimistic.mockReturnValue(
      makeMutation({ mutate: mutateFn }) as unknown as ReturnType<
        typeof useUpdateTaskOptimistic
      >
    );
    renderBoard({ canUpdate: true });

    capturedDragEnd!({
      active: { id: TASK_TODO.id, data: { current: { task: TASK_TODO } } },
      over: { id: "TODO" },
    });

    expect(mutateFn).not.toHaveBeenCalled();
  });

  it("drag sem 'over' NÃO chama mutation", () => {
    const mutateFn = jest.fn();
    mockUseUpdateOptimistic.mockReturnValue(
      makeMutation({ mutate: mutateFn }) as unknown as ReturnType<
        typeof useUpdateTaskOptimistic
      >
    );
    renderBoard({ canUpdate: true });

    capturedDragEnd!({
      active: { id: TASK_TODO.id, data: { current: { task: TASK_TODO } } },
      over: null,
    });

    expect(mutateFn).not.toHaveBeenCalled();
  });

  it("VIEWER (canUpdate=false) NÃO chama mutation ao fazer drag", () => {
    const mutateFn = jest.fn();
    mockUseUpdateOptimistic.mockReturnValue(
      makeMutation({ mutate: mutateFn }) as unknown as ReturnType<
        typeof useUpdateTaskOptimistic
      >
    );
    renderBoard({ canUpdate: false });

    capturedDragEnd!({
      active: { id: TASK_TODO.id, data: { current: { task: TASK_TODO } } },
      over: { id: "IN_PROGRESS" },
    });

    expect(mutateFn).not.toHaveBeenCalled();
  });

  // ── Quick add ────────────────────────────────────────────────────────────

  it("exibe botão '+ Adicionar tarefa' em cada coluna quando canCreate=true", () => {
    renderBoard({ canCreate: true });
    expect(
      screen.getByTestId("kanban-quick-add-btn-TODO")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("kanban-quick-add-btn-IN_PROGRESS")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("kanban-quick-add-btn-DONE")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("kanban-quick-add-btn-CANCELED")
    ).toBeInTheDocument();
  });

  it("clicar em '+ Adicionar tarefa' abre o formulário inline", () => {
    renderBoard({ canCreate: true });
    fireEvent.click(screen.getByTestId("kanban-quick-add-btn-TODO"));
    expect(
      screen.getByTestId("kanban-quick-add-form-TODO")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("kanban-quick-add-input-TODO")
    ).toBeInTheDocument();
  });

  it("quick add chama createTask mutation com título e status corretos", () => {
    const mutateFn = jest.fn();
    mockUseCreateTask.mockReturnValue(
      makeMutation({ mutate: mutateFn }) as unknown as ReturnType<
        typeof useCreateTask
      >
    );
    renderBoard({ canCreate: true });

    fireEvent.click(screen.getByTestId("kanban-quick-add-btn-IN_PROGRESS"));
    const input = screen.getByTestId("kanban-quick-add-input-IN_PROGRESS");
    fireEvent.change(input, { target: { value: "Nova tarefa de teste" } });
    fireEvent.click(
      screen.getByTestId("kanban-quick-add-submit-IN_PROGRESS")
    );

    expect(mutateFn).toHaveBeenCalledWith(
      { title: "Nova tarefa de teste", status: "IN_PROGRESS", tags: [] },
      expect.any(Object)
    );
  });

  it("quick add via Enter chama createTask mutation", () => {
    const mutateFn = jest.fn();
    mockUseCreateTask.mockReturnValue(
      makeMutation({ mutate: mutateFn }) as unknown as ReturnType<
        typeof useCreateTask
      >
    );
    renderBoard({ canCreate: true });

    fireEvent.click(screen.getByTestId("kanban-quick-add-btn-TODO"));
    const input = screen.getByTestId("kanban-quick-add-input-TODO");
    fireEvent.change(input, { target: { value: "Task via enter" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mutateFn).toHaveBeenCalledWith(
      { title: "Task via enter", status: "TODO", tags: [] },
      expect.any(Object)
    );
  });

  it("Escape no quick add fecha o formulário sem chamar mutation", () => {
    const mutateFn = jest.fn();
    mockUseCreateTask.mockReturnValue(
      makeMutation({ mutate: mutateFn }) as unknown as ReturnType<
        typeof useCreateTask
      >
    );
    renderBoard({ canCreate: true });

    fireEvent.click(screen.getByTestId("kanban-quick-add-btn-DONE"));
    const input = screen.getByTestId("kanban-quick-add-input-DONE");
    fireEvent.change(input, { target: { value: "Algo" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(
      screen.queryByTestId("kanban-quick-add-form-DONE")
    ).not.toBeInTheDocument();
    expect(mutateFn).not.toHaveBeenCalled();
  });

  it("quick add com título vazio NÃO chama mutation", () => {
    const mutateFn = jest.fn();
    mockUseCreateTask.mockReturnValue(
      makeMutation({ mutate: mutateFn }) as unknown as ReturnType<
        typeof useCreateTask
      >
    );
    renderBoard({ canCreate: true });

    fireEvent.click(screen.getByTestId("kanban-quick-add-btn-TODO"));
    // Não digita nada — clica direto em Adicionar
    fireEvent.click(screen.getByTestId("kanban-quick-add-submit-TODO"));

    expect(mutateFn).not.toHaveBeenCalled();
  });

  // ── RBAC ─────────────────────────────────────────────────────────────────

  it("VIEWER (canCreate=false) NÃO exibe botões de quick add", () => {
    renderBoard({ canCreate: false });
    expect(
      screen.queryByTestId("kanban-quick-add-btn-TODO")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("kanban-quick-add-btn-IN_PROGRESS")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("kanban-quick-add-btn-DONE")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("kanban-quick-add-btn-CANCELED")
    ).not.toBeInTheDocument();
  });

  it("VIEWER (canUpdate=false) renderiza cards mas sem botão de editar", () => {
    renderBoard({ canUpdate: false });
    // Cards existem (visualização OK)
    expect(
      screen.getByTestId(`task-card-${TASK_TODO.id}`)
    ).toBeInTheDocument();
    // Botão de editar não aparece (requer canUpdate + hover)
    expect(
      screen.queryByTestId(`task-card-edit-${TASK_TODO.id}`)
    ).not.toBeInTheDocument();
  });
});

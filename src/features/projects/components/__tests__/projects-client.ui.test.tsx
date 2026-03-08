/**
 * UI tests para ProjectsClient (RTL).
 * Usa mocks de módulo (useProjects, useDeleteProject) em vez de MSW
 * para evitar problemas de compatibilidade ESM/CJS em jest.
 *
 * Como rodar: pnpm test:ui
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectsClient } from "../projects-client";

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/org/test-org/projects"),
}));

jest.mock("@/features/projects/hooks/use-projects");
jest.mock("@/features/projects/hooks/use-delete-project");
jest.mock("../project-form-modal", () => ({
  ProjectFormModal: () => null,
}));

import { useProjects } from "@/features/projects/hooks/use-projects";
import { useDeleteProject } from "@/features/projects/hooks/use-delete-project";

const mockUseProjects = useProjects as jest.MockedFunction<typeof useProjects>;
const mockUseDeleteProject = useDeleteProject as jest.MockedFunction<typeof useDeleteProject>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_PROJECT = {
  id: "proj-1",
  name: "Projeto Teste",
  description: "Descrição do projeto",
  orgId: "org-1",
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
};

function makeDeleteMutation(overrides = {}) {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

interface RenderProps {
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

function renderProjects({ canCreate = true, canUpdate = true, canDelete = true }: RenderProps = {}) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <ProjectsClient
        orgSlug="test-org"
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </QueryClientProvider>
  );
}

function mockProjectsLoaded(items = [MOCK_PROJECT]) {
  mockUseProjects.mockReturnValue({
    data: { items, total: items.length, page: 1, pageSize: 10, totalPages: 1 },
    isLoading: false,
    isError: false,
    error: null,
    status: "success",
    fetchStatus: "idle",
  } as ReturnType<typeof useProjects>);
  mockUseDeleteProject.mockReturnValue(makeDeleteMutation() as unknown as ReturnType<typeof useDeleteProject>);
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("ProjectsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exibe tabela de projetos após carregar dados", () => {
    mockProjectsLoaded();
    renderProjects();

    expect(screen.getByTestId("projects-table")).toBeInTheDocument();
    expect(screen.getByText(MOCK_PROJECT.name)).toBeInTheDocument();
  });

  it("exibe empty state quando não há projetos", () => {
    mockProjectsLoaded([]);
    renderProjects();

    expect(screen.getByText("Nenhum projeto encontrado")).toBeInTheDocument();
    expect(screen.queryByTestId("projects-table")).not.toBeInTheDocument();
  });

  it("exibe mensagem de erro quando API falha", () => {
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Internal Server Error"),
      status: "error",
      fetchStatus: "idle",
    } as ReturnType<typeof useProjects>);
    mockUseDeleteProject.mockReturnValue(makeDeleteMutation() as unknown as ReturnType<typeof useDeleteProject>);
    renderProjects();

    expect(screen.getByText(/Erro ao carregar projetos/)).toBeInTheDocument();
  });

  it("exibe botão 'Novo Projeto' quando canCreate=true", () => {
    mockProjectsLoaded();
    renderProjects({ canCreate: true });

    const btn = screen.getByTestId("new-project-btn");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("Novo Projeto");
  });

  it("oculta botão 'Novo Projeto' quando canCreate=false", () => {
    mockProjectsLoaded();
    renderProjects({ canCreate: false });

    expect(screen.queryByTestId("new-project-btn")).not.toBeInTheDocument();
  });

  it("exibe descrição do projeto quando disponível", () => {
    mockProjectsLoaded();
    renderProjects();

    expect(screen.getByText(MOCK_PROJECT.description!)).toBeInTheDocument();
  });

  it("empty state sem dica de criar quando canCreate=false", () => {
    mockProjectsLoaded([]);
    renderProjects({ canCreate: false });

    expect(screen.getByText("Nenhum projeto encontrado")).toBeInTheDocument();
    expect(screen.queryByText(/Crie o primeiro projeto/)).not.toBeInTheDocument();
  });

  it("exibe estado de loading (skeletons) quando isLoading=true", () => {
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      status: "pending",
      fetchStatus: "fetching",
    } as ReturnType<typeof useProjects>);
    mockUseDeleteProject.mockReturnValue(makeDeleteMutation() as unknown as ReturnType<typeof useDeleteProject>);
    renderProjects();

    // Na fase de loading, a tabela não deve estar visível
    expect(screen.queryByTestId("projects-table")).not.toBeInTheDocument();
  });
});

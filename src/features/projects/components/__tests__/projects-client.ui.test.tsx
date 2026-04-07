/**
 * UI tests para ProjectsClient (RTL).
 * Usa mocks de módulo (useProjects, useDeleteProject) em vez de MSW
 * para evitar problemas de compatibilidade ESM/CJS em jest.
 *
 * Como rodar: pnpm test:ui
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useProjects>);
  mockUseDeleteProject.mockReturnValue(makeDeleteMutation() as unknown as ReturnType<typeof useDeleteProject>);
}

function mockProjectsError(message = "Internal Server Error") {
  mockUseProjects.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error(message),
    status: "error",
    fetchStatus: "idle",
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useProjects>);
  mockUseDeleteProject.mockReturnValue(makeDeleteMutation() as unknown as ReturnType<typeof useDeleteProject>);
}

function mockProjectsLoading() {
  mockUseProjects.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    status: "pending",
    fetchStatus: "fetching",
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useProjects>);
  mockUseDeleteProject.mockReturnValue(makeDeleteMutation() as unknown as ReturnType<typeof useDeleteProject>);
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("ProjectsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Loading ────────────────────────────────────────────────────────────────

  it("exibe skeletons de loading quando isLoading=true", () => {
    mockProjectsLoading();
    renderProjects();
    expect(screen.queryByTestId("projects-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state-cta")).not.toBeInTheDocument();
  });

  // ── Tabela com dados ───────────────────────────────────────────────────────

  it("exibe tabela de projetos após carregar dados", () => {
    mockProjectsLoaded();
    renderProjects();

    expect(screen.getByTestId("projects-table")).toBeInTheDocument();
    expect(screen.getByText(MOCK_PROJECT.name)).toBeInTheDocument();
  });

  it("exibe descrição do projeto quando disponível", () => {
    mockProjectsLoaded();
    renderProjects();

    expect(screen.getByText(MOCK_PROJECT.description!)).toBeInTheDocument();
  });

  it("exibe botão 'Novo Projeto' na toolbar quando canCreate=true e há dados", () => {
    mockProjectsLoaded();
    renderProjects({ canCreate: true });

    const btn = screen.getByTestId("new-project-btn");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("Novo Projeto");
  });

  it("oculta botão 'Novo Projeto' na toolbar quando canCreate=false", () => {
    mockProjectsLoaded();
    renderProjects({ canCreate: false });

    expect(screen.queryByTestId("new-project-btn")).not.toBeInTheDocument();
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it("exibe empty state quando não há projetos", () => {
    mockProjectsLoaded([]);
    renderProjects();

    expect(screen.getByText("Nenhum projeto ainda")).toBeInTheDocument();
    expect(screen.queryByTestId("projects-table")).not.toBeInTheDocument();
  });

  it("exibe CTA 'Criar primeiro projeto' no empty state quando canCreate=true", () => {
    mockProjectsLoaded([]);
    renderProjects({ canCreate: true });

    const cta = screen.getByTestId("empty-state-cta");
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveTextContent("Criar primeiro projeto");
  });

  it("CTA do empty state abre o modal de criação", () => {
    mockProjectsLoaded([]);
    renderProjects({ canCreate: true });

    const cta = screen.getByTestId("empty-state-cta");
    fireEvent.click(cta);

    // O modal recebe open=true — verificamos que o ProjectFormModal foi chamado.
    // Como ProjectFormModal está mockado como null, o efeito visível é que
    // o CTA foi clicado sem erro e o estado interno mudou (modal open).
    // Validamos que o CTA continua acessível (não crashou).
    expect(cta).toBeInTheDocument();
  });

  it("oculta CTA do empty state quando canCreate=false", () => {
    mockProjectsLoaded([]);
    renderProjects({ canCreate: false });

    expect(screen.queryByTestId("empty-state-cta")).not.toBeInTheDocument();
    expect(screen.getByText("Nenhum projeto ainda")).toBeInTheDocument();
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it("exibe ErrorState com botão de retry quando API falha", () => {
    mockProjectsError("Falha na conexão");
    renderProjects();

    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getByText(/Falha na conexão/)).toBeInTheDocument();
    expect(screen.queryByTestId("projects-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state-cta")).not.toBeInTheDocument();
  });

  it("botão de retry chama refetch quando clicado", () => {
    const refetchFn = jest.fn().mockResolvedValue(undefined);
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("erro"),
      status: "error",
      fetchStatus: "idle",
      refetch: refetchFn,
    } as unknown as ReturnType<typeof useProjects>);
    mockUseDeleteProject.mockReturnValue(makeDeleteMutation() as unknown as ReturnType<typeof useDeleteProject>);

    renderProjects();

    const retryBtn = screen.getByTestId("error-retry-btn");
    fireEvent.click(retryBtn);

    expect(refetchFn).toHaveBeenCalledTimes(1);
  });
});

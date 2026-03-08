import { http, HttpResponse } from "msw";
import type { PaginatedResult, Project } from "@/server/repo/project-repo";

/** Projeto de exemplo fixo para testes de UI */
export const MOCK_PROJECT: Project = {
  id: "proj-test-1",
  orgId: "org-test",
  name: "Projeto de Teste",
  description: "Descrição do projeto de teste",
  createdAt: new Date("2024-01-15T10:00:00.000Z"),
  updatedAt: new Date("2024-01-15T10:00:00.000Z"),
};

export const MOCK_PROJECT_2: Project = {
  id: "proj-test-2",
  orgId: "org-test",
  name: "Segundo Projeto",
  description: null,
  createdAt: new Date("2024-01-16T10:00:00.000Z"),
  updatedAt: new Date("2024-01-16T10:00:00.000Z"),
};

/** Resposta padrão: lista com 1 projeto */
const projectListOk: PaginatedResult<Project> = {
  items: [MOCK_PROJECT],
  total: 1,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

/** Resposta lista vazia */
const projectListEmpty: PaginatedResult<Project> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};

export const projectHandlers = [
  /** GET /api/org/:orgSlug/projects — lista com 1 projeto por padrão */
  http.get("*/api/org/:orgSlug/projects", () => {
    return HttpResponse.json(projectListOk);
  }),

  /** DELETE /api/org/:orgSlug/projects/:projectId */
  http.delete("*/api/org/:orgSlug/projects/:projectId", () => {
    return HttpResponse.json({ ok: true });
  }),
];

export const projectHandlersEmpty = [
  http.get("*/api/org/:orgSlug/projects", () => {
    return HttpResponse.json(projectListEmpty);
  }),
];

export const projectHandlersError = [
  http.get("*/api/org/:orgSlug/projects", () => {
    return HttpResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }),
];

export { projectListOk, projectListEmpty };

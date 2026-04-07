/**
 * Unit tests para schemas/data-export.ts
 */

import {
  exportPayloadSchema,
  exportProjectSchema,
  exportTaskSchema,
  importQuerySchema,
  EXPORT_LIMITS,
} from "@/schemas/data-export";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProject(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    externalId: randomUUID(),
    name: "Projeto Teste",
    description: "Desc",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTask(projectExternalId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    externalId: randomUUID(),
    projectExternalId,
    title: "Task Teste",
    description: null,
    status: "TODO" as const,
    tags: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePayload(
  projects: unknown[] = [makeProject()],
  tasks: unknown[] = []
): unknown {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    org: { id: "org-id", slug: "minha-org", name: "Minha Org" },
    data: { projects, tasks },
  };
}

// ---------------------------------------------------------------------------
// exportProjectSchema
// ---------------------------------------------------------------------------

describe("exportProjectSchema", () => {
  it("aceita project válido", () => {
    const result = exportProjectSchema.safeParse(makeProject());
    expect(result.success).toBe(true);
  });

  it("rejeita name vazio", () => {
    expect(exportProjectSchema.safeParse(makeProject({ name: "" })).success).toBe(false);
  });

  it(`rejeita name > ${EXPORT_LIMITS.MAX_PROJECT_NAME} chars`, () => {
    const result = exportProjectSchema.safeParse(
      makeProject({ name: "a".repeat(EXPORT_LIMITS.MAX_PROJECT_NAME + 1) })
    );
    expect(result.success).toBe(false);
  });

  it("faz trim do name", () => {
    const result = exportProjectSchema.safeParse(makeProject({ name: "  Projeto  " }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Projeto");
  });

  it("rejeita externalId que não é UUID", () => {
    expect(exportProjectSchema.safeParse(makeProject({ externalId: "nao-uuid" })).success).toBe(false);
  });

  it("aceita description null", () => {
    const result = exportProjectSchema.safeParse(makeProject({ description: null }));
    expect(result.success).toBe(true);
  });

  it("aceita description undefined (opcional)", () => {
    const p = makeProject();
    const { description: _, ...rest } = p as Record<string, unknown>;
    const result = exportProjectSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// exportTaskSchema
// ---------------------------------------------------------------------------

describe("exportTaskSchema", () => {
  const projId = randomUUID();

  it("aceita task válida", () => {
    const result = exportTaskSchema.safeParse(makeTask(projId));
    expect(result.success).toBe(true);
  });

  it("rejeita status inválido", () => {
    const result = exportTaskSchema.safeParse(makeTask(projId, { status: "INVALID" }));
    expect(result.success).toBe(false);
  });

  it("aceita todos os status válidos", () => {
    for (const status of ["TODO", "IN_PROGRESS", "DONE", "CANCELED"]) {
      const result = exportTaskSchema.safeParse(makeTask(projId, { status }));
      expect(result.success).toBe(true);
    }
  });

  it(`rejeita title > ${EXPORT_LIMITS.MAX_TASK_TITLE} chars`, () => {
    const result = exportTaskSchema.safeParse(
      makeTask(projId, { title: "a".repeat(EXPORT_LIMITS.MAX_TASK_TITLE + 1) })
    );
    expect(result.success).toBe(false);
  });

  it("rejeita title vazio", () => {
    expect(exportTaskSchema.safeParse(makeTask(projId, { title: "" })).success).toBe(false);
  });

  it(`rejeita mais de ${EXPORT_LIMITS.MAX_TAGS_PER_TASK} tags`, () => {
    const tags = Array(EXPORT_LIMITS.MAX_TAGS_PER_TASK + 1).fill("tag");
    const result = exportTaskSchema.safeParse(makeTask(projId, { tags }));
    expect(result.success).toBe(false);
  });

  it(`rejeita tag > ${EXPORT_LIMITS.MAX_TAG_LENGTH} chars`, () => {
    const result = exportTaskSchema.safeParse(
      makeTask(projId, { tags: ["a".repeat(EXPORT_LIMITS.MAX_TAG_LENGTH + 1)] })
    );
    expect(result.success).toBe(false);
  });

  it("aceita até o limite de tags", () => {
    const tags = Array(EXPORT_LIMITS.MAX_TAGS_PER_TASK).fill("tag");
    const result = exportTaskSchema.safeParse(makeTask(projId, { tags }));
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// exportPayloadSchema
// ---------------------------------------------------------------------------

describe("exportPayloadSchema", () => {
  it("aceita payload completo válido", () => {
    const projId = randomUUID();
    const payload = makePayload(
      [makeProject({ externalId: projId })],
      [makeTask(projId)]
    );
    expect(exportPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("rejeita version diferente de 1", () => {
    const payload = { ...makePayload() as Record<string, unknown>, version: 2 };
    expect(exportPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("rejeita payload sem version", () => {
    const p = makePayload() as Record<string, unknown>;
    const { version: _, ...rest } = p;
    expect(exportPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it(`rejeita mais de ${EXPORT_LIMITS.MAX_PROJECTS} projects`, () => {
    const projects = Array(EXPORT_LIMITS.MAX_PROJECTS + 1)
      .fill(null)
      .map(() => makeProject());
    expect(exportPayloadSchema.safeParse(makePayload(projects)).success).toBe(false);
  });

  it(`rejeita mais de ${EXPORT_LIMITS.MAX_TASKS} tasks`, () => {
    const projId = randomUUID();
    const tasks = Array(EXPORT_LIMITS.MAX_TASKS + 1)
      .fill(null)
      .map(() => makeTask(projId));
    expect(
      exportPayloadSchema.safeParse(makePayload([makeProject({ externalId: projId })], tasks)).success
    ).toBe(false);
  });

  it("aceita payload sem tasks (data.tasks vazio)", () => {
    expect(exportPayloadSchema.safeParse(makePayload([makeProject()], [])).success).toBe(true);
  });

  it("aceita payload sem projects (data.projects vazio)", () => {
    expect(exportPayloadSchema.safeParse(makePayload([], [])).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// importQuerySchema
// ---------------------------------------------------------------------------

describe("importQuerySchema", () => {
  it("retorna dryRun=false por default", () => {
    const result = importQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dryRun).toBe(false);
  });

  it("retorna dryRun=true quando dryRun='true'", () => {
    const result = importQuerySchema.safeParse({ dryRun: "true" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dryRun).toBe(true);
  });

  it("retorna dryRun=false quando dryRun='false'", () => {
    const result = importQuerySchema.safeParse({ dryRun: "false" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dryRun).toBe(false);
  });
});

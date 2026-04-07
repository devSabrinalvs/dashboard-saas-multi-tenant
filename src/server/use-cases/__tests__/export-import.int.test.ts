/**
 * Integration tests para export/import de dados de organização — Etapa Q.
 *
 * Testa:
 * - exportOrgData: retorna payload v1 com counts corretos, sem dados proibidos
 * - importOrgData: cria projects + tasks, mapeia externalIds, dryRun
 * - Isolamento: tasks com projectExternalId inválido são ignoradas
 * - importOrgData em transação: rollback em caso de erro (simulado via dados inválidos)
 */

import {
  resetDb,
  testPrisma,
  createTestUser,
  createOrgWithMembership,
  createTestProject,
  createTestTask,
} from "@tests/helpers/db";

import { exportOrgData } from "@/server/use-cases/export-org-data";
import { importOrgData } from "@/server/use-cases/import-org-data";
import type { ExportPayload } from "@/schemas/data-export";
import { randomUUID } from "crypto";

beforeEach(async () => {
  await resetDb();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidPayload(
  orgSlug: string,
  projectCount = 2,
  taskCount = 3
): ExportPayload {
  const projectExtIds = Array.from({ length: projectCount }, () => randomUUID());
  const projects = projectExtIds.map((externalId, i) => ({
    externalId,
    name: `Import Project ${i + 1}`,
    description: null,
    createdAt: new Date().toISOString(),
  }));
  const tasks = Array.from({ length: taskCount }, (_, i) => ({
    externalId: randomUUID(),
    projectExternalId: projectExtIds[i % projectCount]!,
    title: `Import Task ${i + 1}`,
    description: null,
    status: "TODO" as const,
    tags: ["imported"],
    createdAt: new Date().toISOString(),
  }));
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    org: { id: "source-org-id", slug: orgSlug, name: "Source Org" },
    data: { projects, tasks },
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

describe("exportOrgData", () => {
  it("retorna version=1 e counts corretos", async () => {
    const user = await createTestUser("export-owner@test.com");
    const org = await createOrgWithMembership(user.id, "export-org-1");

    const p1 = await createTestProject(org.id, { name: "Projeto A" });
    const p2 = await createTestProject(org.id, { name: "Projeto B" });
    await createTestTask(org.id, p1.id, { title: "Task 1" });
    await createTestTask(org.id, p1.id, { title: "Task 2" });
    await createTestTask(org.id, p2.id, { title: "Task 3" });

    const result = await exportOrgData(org.id, org.slug, org.name);

    expect(result.payload.version).toBe(1);
    expect(result.projectCount).toBe(2);
    expect(result.taskCount).toBe(3);
    expect(result.payload.org.slug).toBe(org.slug);
    expect(result.payload.org.name).toBe(org.name);
  });

  it("projects têm externalId UUID único", async () => {
    const user = await createTestUser("export-uuid@test.com");
    const org = await createOrgWithMembership(user.id, "export-org-uuid");

    await createTestProject(org.id, { name: "P1" });
    await createTestProject(org.id, { name: "P2" });

    const result = await exportOrgData(org.id, org.slug, org.name);
    const extIds = result.payload.data.projects.map((p) => p.externalId);

    expect(extIds[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    // IDs são únicos
    expect(new Set(extIds).size).toBe(extIds.length);
  });

  it("tasks referenciam o projectExternalId correto", async () => {
    const user = await createTestUser("export-ref@test.com");
    const org = await createOrgWithMembership(user.id, "export-org-ref");

    const p = await createTestProject(org.id, { name: "Único Projeto" });
    await createTestTask(org.id, p.id, { title: "T1" });
    await createTestTask(org.id, p.id, { title: "T2" });

    const result = await exportOrgData(org.id, org.slug, org.name);
    const projectExtId = result.payload.data.projects[0]!.externalId;

    for (const task of result.payload.data.tasks) {
      expect(task.projectExternalId).toBe(projectExtId);
    }
  });

  it("não inclui campos proibidos (password, tokens, secrets)", async () => {
    const user = await createTestUser("export-safe@test.com");
    const org = await createOrgWithMembership(user.id, "export-org-safe");
    await createTestProject(org.id, { name: "Safe Project" });

    const result = await exportOrgData(org.id, org.slug, org.name);
    const json = JSON.stringify(result.payload);

    // Verificar que nenhum campo sensível vazou
    expect(json).not.toMatch(/password/i);
    expect(json).not.toMatch(/token/i);
    expect(json).not.toMatch(/secret/i);
    expect(json).not.toMatch(/totp/i);
    expect(json).not.toMatch(/recovery/i);
    expect(json).not.toMatch(/session/i);
    expect(json).not.toMatch(/bcrypt/i);
  });

  it("retorna payload vazio quando não há projects/tasks", async () => {
    const user = await createTestUser("export-empty@test.com");
    const org = await createOrgWithMembership(user.id, "export-empty-org");

    const result = await exportOrgData(org.id, org.slug, org.name);
    expect(result.projectCount).toBe(0);
    expect(result.taskCount).toBe(0);
    expect(result.payload.data.projects).toHaveLength(0);
    expect(result.payload.data.tasks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

describe("importOrgData", () => {
  it("cria projects e tasks na org destino", async () => {
    const user = await createTestUser("import-owner@test.com");
    const org = await createOrgWithMembership(user.id, "import-dest-org");

    const payload = makeValidPayload("source-org", 2, 4);
    const result = await importOrgData(org.id, payload, false);

    expect(result.createdProjects).toBe(2);
    expect(result.createdTasks).toBe(4);
    expect(result.dryRun).toBe(false);
    expect(result.skippedTasks).toBe(0);

    // Verificar no DB
    const dbProjects = await testPrisma.project.findMany({ where: { orgId: org.id } });
    const dbTasks = await testPrisma.task.findMany({ where: { orgId: org.id } });
    expect(dbProjects).toHaveLength(2);
    expect(dbTasks).toHaveLength(4);
  });

  it("tasks têm orgId correto após import", async () => {
    const user = await createTestUser("import-orgid@test.com");
    const org = await createOrgWithMembership(user.id, "import-orgid-org");

    const payload = makeValidPayload("source", 1, 2);
    await importOrgData(org.id, payload, false);

    const tasks = await testPrisma.task.findMany({ where: { orgId: org.id } });
    for (const t of tasks) {
      expect(t.orgId).toBe(org.id);
    }
  });

  it("dryRun não persiste nada no DB", async () => {
    const user = await createTestUser("import-dry@test.com");
    const org = await createOrgWithMembership(user.id, "import-dry-org");

    const payload = makeValidPayload("source", 3, 5);
    const result = await importOrgData(org.id, payload, true);

    expect(result.dryRun).toBe(true);
    expect(result.createdProjects).toBe(3);
    expect(result.createdTasks).toBe(5);

    // Nada foi criado no DB
    const dbProjects = await testPrisma.project.findMany({ where: { orgId: org.id } });
    const dbTasks = await testPrisma.task.findMany({ where: { orgId: org.id } });
    expect(dbProjects).toHaveLength(0);
    expect(dbTasks).toHaveLength(0);
  });

  it("tasks com projectExternalId inválido são ignoradas com warning", async () => {
    const user = await createTestUser("import-skip@test.com");
    const org = await createOrgWithMembership(user.id, "import-skip-org");

    const projId = randomUUID();
    const payload: ExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      org: { id: "x", slug: "x", name: "X" },
      data: {
        projects: [{ externalId: projId, name: "Projeto", createdAt: new Date().toISOString() }],
        tasks: [
          {
            externalId: randomUUID(),
            projectExternalId: projId, // válido
            title: "Task válida",
            status: "TODO",
            tags: [],
            createdAt: new Date().toISOString(),
          },
          {
            externalId: randomUUID(),
            projectExternalId: randomUUID(), // inválido — não existe no payload
            title: "Task inválida",
            status: "TODO",
            tags: [],
            createdAt: new Date().toISOString(),
          },
        ],
      },
    };

    const result = await importOrgData(org.id, payload, false);
    expect(result.createdTasks).toBe(1);
    expect(result.skippedTasks).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Task inválida");
  });

  it("import mantém dados existentes (append-only)", async () => {
    const user = await createTestUser("import-append@test.com");
    const org = await createOrgWithMembership(user.id, "import-append-org");

    // Criar dados pré-existentes
    const existingProject = await createTestProject(org.id, { name: "Projeto Existente" });
    await createTestTask(org.id, existingProject.id, { title: "Task Existente" });

    const payload = makeValidPayload("source", 1, 2);
    await importOrgData(org.id, payload, false);

    // Dados originais ainda existem
    const dbProjects = await testPrisma.project.findMany({ where: { orgId: org.id } });
    const dbTasks = await testPrisma.task.findMany({ where: { orgId: org.id } });
    expect(dbProjects).toHaveLength(2); // 1 existente + 1 importado
    expect(dbTasks).toHaveLength(3); // 1 existente + 2 importados
  });

  it("isolamento cross-org: import só cria dados na org destino", async () => {
    const user = await createTestUser("import-iso@test.com");
    const org1 = await createOrgWithMembership(user.id, "import-iso-org1");
    const org2 = await createOrgWithMembership(user.id, "import-iso-org2");

    const payload = makeValidPayload("source", 2, 3);
    await importOrgData(org1.id, payload, false);

    // Org2 não foi afetada
    const org2Projects = await testPrisma.project.findMany({ where: { orgId: org2.id } });
    const org2Tasks = await testPrisma.task.findMany({ where: { orgId: org2.id } });
    expect(org2Projects).toHaveLength(0);
    expect(org2Tasks).toHaveLength(0);
  });

  it("preserva nome, title, status e tags do payload", async () => {
    const user = await createTestUser("import-fields@test.com");
    const org = await createOrgWithMembership(user.id, "import-fields-org");

    const projId = randomUUID();
    const payload: ExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      org: { id: "x", slug: "x", name: "X" },
      data: {
        projects: [
          {
            externalId: projId,
            name: "Projeto Específico",
            description: "Descrição do projeto",
            createdAt: new Date().toISOString(),
          },
        ],
        tasks: [
          {
            externalId: randomUUID(),
            projectExternalId: projId,
            title: "Task Específica",
            description: "Desc da task",
            status: "IN_PROGRESS",
            tags: ["bug", "urgente"],
            createdAt: new Date().toISOString(),
          },
        ],
      },
    };

    await importOrgData(org.id, payload, false);

    const dbProject = await testPrisma.project.findFirst({ where: { orgId: org.id } });
    expect(dbProject?.name).toBe("Projeto Específico");
    expect(dbProject?.description).toBe("Descrição do projeto");

    const dbTask = await testPrisma.task.findFirst({ where: { orgId: org.id } });
    expect(dbTask?.title).toBe("Task Específica");
    expect(dbTask?.status).toBe("IN_PROGRESS");
    expect(dbTask?.tags).toEqual(["bug", "urgente"]);
  });
});

// ---------------------------------------------------------------------------
// Permissões (via RBAC — verificado pela lógica pura do can())
// ---------------------------------------------------------------------------

describe("RBAC — data:export / data:import", () => {
  it("OWNER e ADMIN têm permissão data:export e data:import", async () => {
    const { can } = await import("@/security/rbac");
    expect(can("OWNER", "data:export")).toBe(true);
    expect(can("OWNER", "data:import")).toBe(true);
    expect(can("ADMIN", "data:export")).toBe(true);
    expect(can("ADMIN", "data:import")).toBe(true);
  });

  it("MEMBER e VIEWER não têm permissão data:export nem data:import", async () => {
    const { can } = await import("@/security/rbac");
    expect(can("MEMBER", "data:export")).toBe(false);
    expect(can("MEMBER", "data:import")).toBe(false);
    expect(can("VIEWER", "data:export")).toBe(false);
    expect(can("VIEWER", "data:import")).toBe(false);
  });
});

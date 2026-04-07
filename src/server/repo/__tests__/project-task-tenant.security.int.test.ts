/**
 * Testes de regressão de segurança — Isolamento de tenant no repo
 *
 * Verifica que updateProject/deleteProject/updateTask/deleteTask
 * retornam null quando chamados com orgId errado (cross-tenant defense-in-depth).
 *
 * Etapa H: estas funções agora incluem orgId na cláusula WHERE do banco,
 * garantindo isolamento mesmo se a camada de use-case for ignorada.
 */

import {
  updateProject,
  deleteProject,
  findProjectById,
} from "@/server/repo/project-repo";
import {
  updateTask,
  deleteTask,
  findTaskById,
} from "@/server/repo/task-repo";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
  createTestProject,
  createTestTask,
} from "@tests/helpers/db";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ---------------------------------------------------------------------------
// updateProject — cross-tenant
// ---------------------------------------------------------------------------

describe("updateProject — cross-tenant (repo level)", () => {
  it("retorna null ao tentar atualizar projeto de outra org", async () => {
    const user = await createTestUser("owner@sec.com");
    const orgA = await createOrgWithMembership(user.id, "sec-org-a");
    const orgB = await createOrgWithMembership(user.id, "sec-org-b");

    const projectA = await createTestProject(orgA.id, { name: "Projeto A" });

    // Tentativa de atualização com orgId de B
    const result = await updateProject(projectA.id, orgB.id, { name: "Hackeado" });

    expect(result).toBeNull();

    // Projeto de A deve permanecer intacto
    const untouched = await findProjectById(projectA.id, orgA.id);
    expect(untouched?.name).toBe("Projeto A");
  });

  it("atualiza corretamente quando orgId é o correto", async () => {
    const user = await createTestUser("owner2@sec.com");
    const org  = await createOrgWithMembership(user.id, "sec-org-c");

    const project = await createTestProject(org.id, { name: "Original" });

    const updated = await updateProject(project.id, org.id, { name: "Atualizado" });

    expect(updated?.name).toBe("Atualizado");
    expect(updated?.orgId).toBe(org.id);
  });
});

// ---------------------------------------------------------------------------
// deleteProject — cross-tenant
// ---------------------------------------------------------------------------

describe("deleteProject — cross-tenant (repo level)", () => {
  it("retorna null ao tentar deletar projeto de outra org", async () => {
    const user = await createTestUser("del-owner@sec.com");
    const orgA = await createOrgWithMembership(user.id, "sec-del-a");
    const orgB = await createOrgWithMembership(user.id, "sec-del-b");

    const projectA = await createTestProject(orgA.id, { name: "Intocável" });

    // Tentativa de deleção com orgId de B
    const result = await deleteProject(projectA.id, orgB.id);

    expect(result).toBeNull();

    // Projeto de A deve ainda existir
    const still = await findProjectById(projectA.id, orgA.id);
    expect(still).not.toBeNull();
  });

  it("deleta corretamente quando orgId é o correto", async () => {
    const user    = await createTestUser("del-owner2@sec.com");
    const org     = await createOrgWithMembership(user.id, "sec-del-c");
    const project = await createTestProject(org.id, { name: "Deletável" });

    const deleted = await deleteProject(project.id, org.id);

    expect(deleted?.id).toBe(project.id);

    const gone = await findProjectById(project.id, org.id);
    expect(gone).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateTask — cross-tenant
// ---------------------------------------------------------------------------

describe("updateTask — cross-tenant (repo level)", () => {
  it("retorna null ao tentar atualizar task de outra org", async () => {
    const user = await createTestUser("task-owner@sec.com");
    const orgA = await createOrgWithMembership(user.id, "sec-task-a");
    const orgB = await createOrgWithMembership(user.id, "sec-task-b");

    const projectA = await createTestProject(orgA.id, { name: "ProjA" });
    const taskA    = await createTestTask(orgA.id, projectA.id, { title: "Task Original" });

    // Tentativa de atualização com orgId de B
    const result = await updateTask(taskA.id, orgB.id, { title: "Hackeada" });

    expect(result).toBeNull();

    // Task de A deve permanecer intacta
    const untouched = await findTaskById(taskA.id, orgA.id);
    expect(untouched?.title).toBe("Task Original");
  });

  it("atualiza corretamente quando orgId é o correto", async () => {
    const user    = await createTestUser("task-owner2@sec.com");
    const org     = await createOrgWithMembership(user.id, "sec-task-c");
    const project = await createTestProject(org.id, { name: "Proj" });
    const task    = await createTestTask(org.id, project.id, { title: "Original" });

    const updated = await updateTask(task.id, org.id, { title: "Atualizado" });

    expect(updated?.title).toBe("Atualizado");
    expect(updated?.orgId).toBe(org.id);
  });
});

// ---------------------------------------------------------------------------
// deleteTask — cross-tenant
// ---------------------------------------------------------------------------

describe("deleteTask — cross-tenant (repo level)", () => {
  it("retorna null ao tentar deletar task de outra org", async () => {
    const user = await createTestUser("dtask-owner@sec.com");
    const orgA = await createOrgWithMembership(user.id, "sec-dtask-a");
    const orgB = await createOrgWithMembership(user.id, "sec-dtask-b");

    const projectA = await createTestProject(orgA.id, { name: "ProjA" });
    const taskA    = await createTestTask(orgA.id, projectA.id, { title: "Intocável" });

    // Tentativa de deleção com orgId de B
    const result = await deleteTask(taskA.id, orgB.id);

    expect(result).toBeNull();

    // Task de A deve ainda existir
    const still = await findTaskById(taskA.id, orgA.id);
    expect(still).not.toBeNull();
  });

  it("deleta corretamente quando orgId é o correto", async () => {
    const user    = await createTestUser("dtask-owner2@sec.com");
    const org     = await createOrgWithMembership(user.id, "sec-dtask-c");
    const project = await createTestProject(org.id, { name: "Proj" });
    const task    = await createTestTask(org.id, project.id, { title: "Deletável" });

    const deleted = await deleteTask(task.id, org.id);

    expect(deleted?.id).toBe(task.id);

    const gone = await findTaskById(task.id, org.id);
    expect(gone).toBeNull();
  });
});

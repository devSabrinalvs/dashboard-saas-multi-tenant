/**
 * Testes de integração — assignee em Tasks
 *
 * Cobre:
 * - Atribuir responsável na criação de tarefa
 * - Atribuir responsável na atualização de tarefa
 * - Remover responsável (null)
 * - AssigneeNotInOrgError ao tentar atribuir usuário fora da org
 * - Cross-org: usuário membro de org A não pode ser assignee de org B
 * - Filtro assignedToMe: listTasksByProject com assigneeUserId
 */
import { createTask } from "@/server/use-cases/create-task";
import { updateTask } from "@/server/use-cases/update-task";
import { listTasksByProject } from "@/server/use-cases/list-tasks";
import {
  AssigneeNotInOrgError,
} from "@/server/errors/project-errors";
import { Role } from "@/generated/prisma/enums";
import type { OrgContext } from "@/server/org/require-org-context";
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

function makeCtx(
  userId: string,
  email: string,
  org: { id: string; slug: string; name: string },
  role: Role = Role.OWNER
): OrgContext {
  return { userId, email, orgId: org.id, orgSlug: org.slug, orgName: org.name, role, plan: "FREE" };
}

describe("assignee — createTask()", () => {
  it("cria tarefa com assigneeUserId válido (membro da org)", async () => {
    const owner = await createTestUser("owner@test.com");
    const member = await createTestUser("member@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a");
    await testPrisma.membership.create({ data: { userId: member.id, orgId: org.id, role: Role.MEMBER } });
    const ctx = makeCtx(owner.id, owner.email, org);
    const project = await createTestProject(org.id);

    const task = await createTask(ctx, project.id, {
      title: "Tarefa com assignee",
      assigneeUserId: member.id,
    });

    expect(task.assigneeUserId).toBe(member.id);
  });

  it("cria tarefa sem assignee quando assigneeUserId não fornecido", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a");
    const ctx = makeCtx(owner.id, owner.email, org);
    const project = await createTestProject(org.id);

    const task = await createTask(ctx, project.id, { title: "Sem assignee" });

    expect(task.assigneeUserId).toBeNull();
  });

  it("lança AssigneeNotInOrgError ao atribuir usuário fora da org", async () => {
    const owner = await createTestUser("owner@test.com");
    const outsider = await createTestUser("outsider@test.com");
    // outsider NÃO é membro da org
    const org = await createOrgWithMembership(owner.id, "org-a");
    const ctx = makeCtx(owner.id, owner.email, org);
    const project = await createTestProject(org.id);

    await expect(
      createTask(ctx, project.id, {
        title: "Tarefa com outsider",
        assigneeUserId: outsider.id,
      })
    ).rejects.toBeInstanceOf(AssigneeNotInOrgError);
  });

  it("lança AssigneeNotInOrgError ao atribuir membro de outra org (cross-org)", async () => {
    const ownerA = await createTestUser("owner-a@test.com");
    const ownerB = await createTestUser("owner-b@test.com");
    const orgA = await createOrgWithMembership(ownerA.id, "org-a");
    const orgB = await createOrgWithMembership(ownerB.id, "org-b");
    const ctxA = makeCtx(ownerA.id, ownerA.email, orgA);
    const project = await createTestProject(orgA.id);

    // ownerB é membro de orgB mas NÃO de orgA
    await expect(
      createTask(ctxA, project.id, {
        title: "Cross-org assignee",
        assigneeUserId: ownerB.id,
      })
    ).rejects.toBeInstanceOf(AssigneeNotInOrgError);

    // Confirma que orgB não foi afetada
    const count = await testPrisma.task.count({ where: { orgId: orgB.id } });
    expect(count).toBe(0);
  });
});

describe("assignee — updateTask()", () => {
  it("atualiza assignee para membro válido", async () => {
    const owner = await createTestUser("owner@test.com");
    const member = await createTestUser("member@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a");
    await testPrisma.membership.create({ data: { userId: member.id, orgId: org.id, role: Role.MEMBER } });
    const ctx = makeCtx(owner.id, owner.email, org);
    const project = await createTestProject(org.id);
    const task = await createTestTask(org.id, project.id);

    const updated = await updateTask(ctx, task.id, { assigneeUserId: member.id });

    expect(updated.assigneeUserId).toBe(member.id);
  });

  it("remove assignee ao passar null", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a");
    const ctx = makeCtx(owner.id, owner.email, org);
    const project = await createTestProject(org.id);
    const task = await createTestTask(org.id, project.id, { assigneeUserId: owner.id });

    const updated = await updateTask(ctx, task.id, { assigneeUserId: null });

    expect(updated.assigneeUserId).toBeNull();
  });

  it("lança AssigneeNotInOrgError ao atribuir usuário fora da org", async () => {
    const owner = await createTestUser("owner@test.com");
    const outsider = await createTestUser("outsider@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a");
    const ctx = makeCtx(owner.id, owner.email, org);
    const project = await createTestProject(org.id);
    const task = await createTestTask(org.id, project.id);

    await expect(
      updateTask(ctx, task.id, { assigneeUserId: outsider.id })
    ).rejects.toBeInstanceOf(AssigneeNotInOrgError);
  });
});

describe("assignee — listTasksByProject() com filtro assigneeUserId", () => {
  it("filtra tasks pelo assigneeUserId", async () => {
    const owner = await createTestUser("owner@test.com");
    const member = await createTestUser("member@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a");
    await testPrisma.membership.create({ data: { userId: member.id, orgId: org.id, role: Role.MEMBER } });
    const ctx = makeCtx(owner.id, owner.email, org);
    const project = await createTestProject(org.id);

    await createTestTask(org.id, project.id, { title: "Minha tarefa", assigneeUserId: member.id });
    await createTestTask(org.id, project.id, { title: "Sem dono" });
    await createTestTask(org.id, project.id, { title: "Do owner", assigneeUserId: owner.id });

    const result = await listTasksByProject(ctx, project.id, {
      page: 1,
      pageSize: 10,
      assigneeUserId: member.id,
    });

    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe("Minha tarefa");
  });

  it("filtro assignedTo=me retorna apenas tasks do usuário autenticado", async () => {
    const owner = await createTestUser("owner@test.com");
    const member = await createTestUser("member@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a");
    await testPrisma.membership.create({ data: { userId: member.id, orgId: org.id, role: Role.MEMBER } });
    const ctxMember = makeCtx(member.id, member.email, org, Role.MEMBER);
    const project = await createTestProject(org.id);

    await createTestTask(org.id, project.id, { title: "Minha tarefa", assigneeUserId: member.id });
    await createTestTask(org.id, project.id, { title: "Do owner", assigneeUserId: owner.id });
    await createTestTask(org.id, project.id, { title: "Sem dono" });

    const result = await listTasksByProject(ctxMember, project.id, {
      page: 1,
      pageSize: 10,
      assigneeUserId: ctxMember.userId,
    });

    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe("Minha tarefa");
  });

  it("lista todas as tasks quando assigneeUserId não fornecido", async () => {
    const owner = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(owner.id, "org-a");
    const ctx = makeCtx(owner.id, owner.email, org);
    const project = await createTestProject(org.id);

    await createTestTask(org.id, project.id, { assigneeUserId: owner.id });
    await createTestTask(org.id, project.id);

    const result = await listTasksByProject(ctx, project.id, { page: 1, pageSize: 10 });

    expect(result.total).toBe(2);
  });
});

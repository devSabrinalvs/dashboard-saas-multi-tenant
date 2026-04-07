/**
 * Unit tests para src/billing/plan-limits.ts
 * Não usa banco de dados — funções puras apenas.
 */

import {
  getPlanLimits,
  isPlanLimitReached,
  getLimitForResource,
  PlanLimitReachedError,
  PLAN_LIMITS,
  PLAN_LABELS,
  RESOURCE_LABELS,
} from "../plan-limits";
import type { Plan } from "@/generated/prisma/enums";

describe("getPlanLimits", () => {
  it("retorna os limites corretos para FREE", () => {
    const limits = getPlanLimits("FREE");
    expect(limits).toEqual(PLAN_LIMITS.FREE);
    expect(limits.maxMembers).toBe(3);
    expect(limits.maxProjects).toBe(5);
    expect(limits.maxTasksPerProject).toBe(200);
  });

  it("retorna os limites corretos para PRO", () => {
    const limits = getPlanLimits("PRO");
    expect(limits.maxMembers).toBe(15);
    expect(limits.maxProjects).toBe(50);
    expect(limits.maxTasksPerProject).toBe(2000);
  });

  it("retorna os limites corretos para BUSINESS", () => {
    const limits = getPlanLimits("BUSINESS");
    expect(limits.maxMembers).toBe(100);
    expect(limits.maxProjects).toBe(500);
    expect(limits.maxTasksPerProject).toBe(20000);
  });
});

describe("getLimitForResource", () => {
  const freeLimits = PLAN_LIMITS.FREE;

  it("retorna maxMembers para 'members'", () => {
    expect(getLimitForResource(freeLimits, "members")).toBe(freeLimits.maxMembers);
  });

  it("retorna maxProjects para 'projects'", () => {
    expect(getLimitForResource(freeLimits, "projects")).toBe(freeLimits.maxProjects);
  });

  it("retorna maxTasksPerProject para 'tasks_per_project'", () => {
    expect(getLimitForResource(freeLimits, "tasks_per_project")).toBe(freeLimits.maxTasksPerProject);
  });
});

describe("isPlanLimitReached", () => {
  it("retorna false quando current < limit", () => {
    expect(isPlanLimitReached("FREE", "members", 2)).toBe(false);
  });

  it("retorna true quando current === limit (atingido)", () => {
    expect(isPlanLimitReached("FREE", "members", 3)).toBe(true);
  });

  it("retorna true quando current > limit (ultrapassado)", () => {
    expect(isPlanLimitReached("FREE", "members", 4)).toBe(true);
  });

  it("funciona para 'projects'", () => {
    expect(isPlanLimitReached("FREE", "projects", 4)).toBe(false);
    expect(isPlanLimitReached("FREE", "projects", 5)).toBe(true);
  });

  it("funciona para 'tasks_per_project'", () => {
    expect(isPlanLimitReached("PRO", "tasks_per_project", 1999)).toBe(false);
    expect(isPlanLimitReached("PRO", "tasks_per_project", 2000)).toBe(true);
  });

  it("PRO tem limites maiores que FREE", () => {
    // PRO.maxMembers = 15, então 3 não atinge
    expect(isPlanLimitReached("PRO", "members", 3)).toBe(false);
  });
});

describe("PlanLimitReachedError", () => {
  it("tem status 409 e code PLAN_LIMIT_REACHED", () => {
    const err = new PlanLimitReachedError({
      resource: "members",
      limit: 3,
      current: 3,
      plan: "FREE",
    });
    expect(err.status).toBe(409);
    expect(err.code).toBe("PLAN_LIMIT_REACHED");
    expect(err.name).toBe("PlanLimitReachedError");
    expect(err).toBeInstanceOf(Error);
  });

  it("inclui detalhes da violação em err.details", () => {
    const details = { resource: "projects" as const, limit: 5, current: 5, plan: "FREE" as Plan };
    const err = new PlanLimitReachedError(details);
    expect(err.details).toEqual(details);
  });

  it("mensagem descreve o limite violado", () => {
    const err = new PlanLimitReachedError({
      resource: "members",
      limit: 3,
      current: 3,
      plan: "FREE",
    });
    expect(err.message).toContain("FREE");
    expect(err.message).toContain("members");
    expect(err.message).toContain("3/3");
  });
});

describe("PLAN_LABELS", () => {
  it("tem labels para todos os planos", () => {
    expect(PLAN_LABELS.FREE).toBeDefined();
    expect(PLAN_LABELS.PRO).toBeDefined();
    expect(PLAN_LABELS.BUSINESS).toBeDefined();
  });
});

describe("RESOURCE_LABELS", () => {
  it("tem labels para todos os recursos", () => {
    expect(RESOURCE_LABELS.members).toBeDefined();
    expect(RESOURCE_LABELS.projects).toBeDefined();
    expect(RESOURCE_LABELS.tasks_per_project).toBeDefined();
  });
});

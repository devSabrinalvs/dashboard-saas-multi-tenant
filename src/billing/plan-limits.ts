import type { Plan } from "@/generated/prisma/enums";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PlanResource = "members" | "projects" | "tasks_per_project";

export type PlanLimits = {
  /** Máximo de membros (inclui convites pendentes como "assentos reservados"). */
  maxMembers: number;
  /** Máximo de projetos por organização. */
  maxProjects: number;
  /** Máximo de tasks por projeto. */
  maxTasksPerProject: number;
};

export type PlanLimitDetails = {
  resource: PlanResource;
  limit: number;
  current: number;
  plan: Plan;
};

// ─── Limites por plano ────────────────────────────────────────────────────────

/**
 * Fonte única de verdade para os limites de cada plano.
 *
 * Como alterar:
 *   1. Atualize os valores aqui.
 *   2. Os use-cases e a billing page refletirão automaticamente.
 *   3. Para testar localmente: use Prisma Studio para setar org.plan = PRO.
 *
 * Referência de planos:
 *   FREE     → adequado para times pequenos / experimentação
 *   PRO      → equipes profissionais
 *   BUSINESS → escala corporativa / multi-team
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxMembers: 3,
    maxProjects: 5,
    maxTasksPerProject: 200,
  },
  PRO: {
    maxMembers: 15,
    maxProjects: 50,
    maxTasksPerProject: 2000,
  },
  BUSINESS: {
    maxMembers: 100,
    maxProjects: 500,
    maxTasksPerProject: 20000,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retorna os limites do plano especificado.
 */
export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Verifica se o uso atual ultrapassa o limite do plano.
 * Retorna true se o limite foi atingido (current >= limit).
 */
export function isPlanLimitReached(plan: Plan, resource: PlanResource, current: number): boolean {
  const limits = getPlanLimits(plan);
  const limit = getLimitForResource(limits, resource);
  return current >= limit;
}

/**
 * Retorna o valor do limite para o recurso especificado.
 */
export function getLimitForResource(limits: PlanLimits, resource: PlanResource): number {
  switch (resource) {
    case "members":
      return limits.maxMembers;
    case "projects":
      return limits.maxProjects;
    case "tasks_per_project":
      return limits.maxTasksPerProject;
  }
}

// ─── Error ────────────────────────────────────────────────────────────────────

/**
 * Lançado quando uma organização tenta criar um recurso que ultrapassa
 * o limite do plano atual.
 *
 * status 409 (Conflict) — o recurso existe mas o limite foi atingido.
 * code  "PLAN_LIMIT_REACHED" — identificador estável para o cliente.
 */
export class PlanLimitReachedError extends Error {
  readonly status = 409;
  readonly code = "PLAN_LIMIT_REACHED" as const;

  constructor(public readonly details: PlanLimitDetails) {
    super(
      `Limite do plano ${details.plan} atingido para "${details.resource}": ` +
        `${details.current}/${details.limit}.`
    );
    this.name = "PlanLimitReachedError";
  }
}

// ─── Labels em português ──────────────────────────────────────────────────────

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Free",
  PRO: "Pro",
  BUSINESS: "Business",
};

export const RESOURCE_LABELS: Record<PlanResource, string> = {
  members: "Membros",
  projects: "Projetos",
  tasks_per_project: "Tarefas por projeto",
};

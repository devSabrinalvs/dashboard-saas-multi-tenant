/**
 * Utilitários compartilhados pelos testes de integração.
 *
 * Cria um cliente Prisma dedicado ao banco de testes, além de helpers
 * para resetar dados e criar fixtures comuns.
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { InviteStatus, Role, TaskStatus } from "@/generated/prisma/enums";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { hashToken } from "@/server/auth/token";

// ---------------------------------------------------------------------------
// Cliente Prisma de testes
// ---------------------------------------------------------------------------

function makeTestPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está definido. Verifique .env.test.");
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const testPrisma = makeTestPrisma();

// ---------------------------------------------------------------------------
// Reset de dados
// ---------------------------------------------------------------------------

/**
 * Remove todos os dados das tabelas na ordem correta (FK-safe).
 * Deve ser chamado em `beforeEach` para isolar testes.
 */
export async function resetDb(): Promise<void> {
  // Tabelas dependentes primeiro.
  // AuditLog é deletado logo antes de Organization para minimizar a janela de
  // race condition com logAudit fire-and-forget (que pode gravar em paralelo).
  await testPrisma.$executeRaw`DELETE FROM "AdminAuditLog"`;
  await testPrisma.$executeRaw`DELETE FROM "RateLimitBucket"`;
  await testPrisma.$executeRaw`DELETE FROM "Task"`;
  await testPrisma.$executeRaw`DELETE FROM "Project"`;
  await testPrisma.$executeRaw`DELETE FROM "Invite"`;
  await testPrisma.$executeRaw`DELETE FROM "Membership"`;
  await testPrisma.$executeRaw`DELETE FROM "StripeWebhookEvent"`;
  await testPrisma.$executeRaw`DELETE FROM "BillingEmailSent"`;
  await testPrisma.$executeRaw`DELETE FROM "AuditLog"`;
  await testPrisma.$executeRaw`DELETE FROM "Organization"`;
  // Auth.js tables + email/password tokens + 2FA + sessions
  await testPrisma.$executeRaw`DELETE FROM "UserSessionMeta"`;
  await testPrisma.$executeRaw`DELETE FROM "TrustedDevice"`;
  await testPrisma.$executeRaw`DELETE FROM "TwoFactorVerification"`;
  await testPrisma.$executeRaw`DELETE FROM "PasswordResetToken"`;
  await testPrisma.$executeRaw`DELETE FROM "EmailVerificationToken"`;
  await testPrisma.$executeRaw`DELETE FROM "Session"`;
  await testPrisma.$executeRaw`DELETE FROM "Account"`;
  await testPrisma.$executeRaw`DELETE FROM "VerificationToken"`;
  // Por último: User (referenciado pelas demais)
  await testPrisma.$executeRaw`DELETE FROM "User"`;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export interface TestUser {
  id: string;
  email: string;
}

/**
 * Cria um usuário no banco de testes.
 * Usa fator de custo 1 no bcrypt para velocidade em testes.
 * @param email - email do usuário (padrão: test@example.com)
 * @param options.emailVerified - se true, seta emailVerified = now (padrão: false)
 */
export async function createTestUser(
  email = "test@example.com",
  options: {
    emailVerified?: boolean;
    failedLoginCount?: number;
    lockedUntil?: Date | null;
    lastSecurityAlertAt?: Date | null;
    deletedAt?: Date | null;
    /** Se false, o usuário não terá senha (simula Google-only). Padrão: true. */
    hasPassword?: boolean;
    twoFactorEnabled?: boolean;
    lastLoginAt?: Date | null;
  } = {}
): Promise<TestUser> {
  const hasPassword = options.hasPassword ?? true;
  const password = hasPassword ? await bcrypt.hash("password123", 1) : null;
  const user = await testPrisma.user.create({
    data: {
      email,
      password,
      name: "Test User",
      emailVerified: options.emailVerified ? new Date() : null,
      failedLoginCount: options.failedLoginCount ?? 0,
      lockedUntil: options.lockedUntil ?? null,
      lastSecurityAlertAt: options.lastSecurityAlertAt ?? null,
      deletedAt: options.deletedAt ?? null,
      twoFactorEnabled: options.twoFactorEnabled ?? false,
      lastLoginAt: options.lastLoginAt ?? null,
    },
  });
  return { id: user.id, email: user.email };
}

export interface TestOrg {
  id: string;
  slug: string;
  name: string;
}

/**
 * Cria uma organização e um Membership para o usuário informado.
 */
export async function createOrgWithMembership(
  userId: string,
  orgSlug: string,
  role: Role = Role.OWNER,
): Promise<TestOrg> {
  const org = await testPrisma.organization.create({
    data: { name: `Org ${orgSlug}`, slug: orgSlug },
  });
  await testPrisma.membership.create({
    data: { userId, orgId: org.id, role },
  });
  return { id: org.id, slug: org.slug, name: org.name };
}

export interface TestInvite {
  id: string;
  token: string;
  email: string;
  orgId: string;
}

/**
 * Cria um convite no banco de testes.
 * Por padrão: PENDING, expira em 7 dias.
 */
export interface TestProject {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
}

/**
 * Cria um projeto no banco de testes.
 */
export async function createTestProject(
  orgId: string,
  overrides: { name?: string; description?: string } = {}
): Promise<TestProject> {
  const project = await testPrisma.project.create({
    data: {
      orgId,
      name: overrides.name ?? `Projeto ${randomUUID().slice(0, 8)}`,
      description: overrides.description ?? null,
    },
  });
  return {
    id: project.id,
    orgId: project.orgId,
    name: project.name,
    description: project.description,
  };
}

export interface TestTask {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  tags: string[];
  assigneeUserId: string | null;
}

/**
 * Cria uma tarefa no banco de testes.
 */
export async function createTestTask(
  orgId: string,
  projectId: string,
  overrides: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    tags?: string[];
    assigneeUserId?: string | null;
  } = {}
): Promise<TestTask> {
  const task = await testPrisma.task.create({
    data: {
      orgId,
      projectId,
      title: overrides.title ?? `Tarefa ${randomUUID().slice(0, 8)}`,
      description: overrides.description ?? null,
      status: overrides.status ?? TaskStatus.TODO,
      tags: overrides.tags ?? [],
      assigneeUserId: overrides.assigneeUserId ?? null,
    },
  });
  return {
    id: task.id,
    orgId: task.orgId,
    projectId: task.projectId,
    title: task.title,
    status: task.status,
    tags: task.tags,
    assigneeUserId: task.assigneeUserId,
  };
}

export async function createTestInvite(
  orgId: string,
  email: string,
  overrides: {
    status?: InviteStatus;
    expiresAt?: Date;
    token?: string;
  } = {}
): Promise<TestInvite> {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const invite = await testPrisma.invite.create({
    data: {
      orgId,
      email,
      token: overrides.token ?? randomUUID(),
      status: overrides.status ?? InviteStatus.PENDING,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + SEVEN_DAYS_MS),
    },
  });
  return { id: invite.id, token: invite.token, email: invite.email, orgId: invite.orgId };
}

export interface TestVerificationToken {
  id: string;
  tokenHash: string;
}

/**
 * Cria um EmailVerificationToken no banco de testes.
 * O rawToken é hasheado com SHA-256 antes de salvar (idêntico à lógica de produção).
 * @param userId - ID do usuário dono do token
 * @param rawToken - token raw (vai no link de email); o hash é salvo no DB
 * @param overrides.expiresAt - data de expiração (padrão: +24h)
 * @param overrides.usedAt - se definido, marca o token como já usado
 */
export async function createTestVerificationToken(
  userId: string,
  rawToken: string,
  overrides: {
    expiresAt?: Date;
    usedAt?: Date | null;
  } = {}
): Promise<TestVerificationToken> {
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const tokenHash = hashToken(rawToken);
  const record = await testPrisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + TWENTY_FOUR_HOURS_MS),
      usedAt: overrides.usedAt ?? null,
    },
  });
  return { id: record.id, tokenHash: record.tokenHash };
}

// ---------------------------------------------------------------------------
// Session meta fixtures
// ---------------------------------------------------------------------------

export interface TestSessionMeta {
  id: string;
  sessionId: string;
}

/**
 * Cria um UserSessionMeta no banco de testes.
 */
export async function createTestSessionMeta(
  userId: string,
  sessionId: string,
  overrides: {
    ip?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
    lastSeenAt?: Date;
    revokedAt?: Date | null;
  } = {}
): Promise<TestSessionMeta> {
  const record = await testPrisma.userSessionMeta.create({
    data: {
      userId,
      sessionId,
      ip: overrides.ip ?? null,
      userAgent: overrides.userAgent ?? null,
      deviceLabel: overrides.deviceLabel ?? null,
      lastSeenAt: overrides.lastSeenAt ?? new Date(),
      revokedAt: overrides.revokedAt ?? null,
    },
  });
  return { id: record.id, sessionId: record.sessionId };
}

export interface TestPasswordResetToken {
  id: string;
  tokenHash: string;
}

/**
 * Cria um PasswordResetToken no banco de testes.
 * O rawToken é hasheado com SHA-256 antes de salvar (idêntico à lógica de produção).
 * @param userId - ID do usuário dono do token
 * @param rawToken - token raw (vai no link de email); o hash é salvo no DB
 * @param overrides.expiresAt - data de expiração (padrão: +60min)
 * @param overrides.usedAt - se definido, marca o token como já usado
 */
export async function createTestPasswordResetToken(
  userId: string,
  rawToken: string,
  overrides: {
    expiresAt?: Date;
    usedAt?: Date | null;
  } = {}
): Promise<TestPasswordResetToken> {
  const SIXTY_MINUTES_MS = 60 * 60 * 1000;
  const tokenHash = hashToken(rawToken);
  const record = await testPrisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + SIXTY_MINUTES_MS),
      usedAt: overrides.usedAt ?? null,
    },
  });
  return { id: record.id, tokenHash: record.tokenHash };
}

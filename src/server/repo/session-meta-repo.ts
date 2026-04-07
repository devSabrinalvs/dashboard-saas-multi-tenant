/**
 * Repositório de UserSessionMeta — metadata de sessões de login.
 *
 * Como o NextAuth usa JWT strategy (sem escrita na tabela Session), usamos
 * UserSessionMeta para rastrear, listar e revogar sessões individualmente.
 *
 * Restrições Prisma 7 + PrismaPg:
 *  - findMany NÃO funciona → usar $queryRaw para listagens
 *  - updateMany FUNCIONA → usado para revogar-outras
 */

import { prisma } from "@/lib/prisma";
import { shouldUpdateLastSeen } from "@/server/security/session-utils";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface SessionMetaRow {
  id: string;
  sessionId: string;
  createdAt: Date;
  lastSeenAt: Date;
  ip: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
  revokedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Criar
// ---------------------------------------------------------------------------

/** Cria metadata de sessão ao fazer login. Chamado no jwt callback. */
export async function createSessionMeta(params: {
  userId: string;
  sessionId: string;
  ip: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
}): Promise<void> {
  await prisma.userSessionMeta.create({
    data: {
      userId: params.userId,
      sessionId: params.sessionId,
      ip: params.ip,
      userAgent: params.userAgent,
      deviceLabel: params.deviceLabel,
    },
  });
}

// ---------------------------------------------------------------------------
// Buscar
// ---------------------------------------------------------------------------

/**
 * Retorna o createdAt de uma sessão (timestamp de login).
 * Usado para verificar "recent login" no fluxo de deleção de conta.
 */
export async function getSessionCreatedAt(
  sessionId: string
): Promise<Date | null> {
  const meta = await prisma.userSessionMeta.findUnique({
    where: { sessionId },
    select: { createdAt: true },
  });
  return meta?.createdAt ?? null;
}

/** Busca metadata de sessão pelo sessionId (para checar revogação). */
export async function findSessionMeta(
  sessionId: string
): Promise<Pick<SessionMetaRow, "revokedAt" | "id"> | null> {
  return prisma.userSessionMeta.findUnique({
    where: { sessionId },
    select: { id: true, revokedAt: true },
  });
}

// ---------------------------------------------------------------------------
// Listar — usa $queryRaw por limitação do PrismaPg
// ---------------------------------------------------------------------------

/**
 * Retorna sessões ativas do usuário (não revogadas, vistas nos últimos 30 dias).
 * Ordenadas por lastSeenAt DESC.
 */
export async function listActiveSessions(
  userId: string
): Promise<SessionMetaRow[]> {
  return prisma.$queryRaw<SessionMetaRow[]>`
    SELECT
      id,
      "sessionId",
      "createdAt",
      "lastSeenAt",
      ip,
      "userAgent",
      "deviceLabel",
      "revokedAt"
    FROM "UserSessionMeta"
    WHERE "userId" = ${userId}
      AND "revokedAt" IS NULL
      AND "lastSeenAt" > NOW() - INTERVAL '30 days'
    ORDER BY "lastSeenAt" DESC
  `;
}

// ---------------------------------------------------------------------------
// Revogar
// ---------------------------------------------------------------------------

/**
 * Revoga uma sessão pelo sessionId.
 * Verifica que pertence ao userId antes de revogar (prevenção de IDOR).
 * Retorna false se não encontrado ou de outro usuário.
 */
export async function revokeSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const meta = await prisma.userSessionMeta.findUnique({
    where: { sessionId },
    select: { userId: true, revokedAt: true },
  });
  if (!meta || meta.userId !== userId) return false;
  if (meta.revokedAt) return true; // já revogada

  await prisma.userSessionMeta.update({
    where: { sessionId },
    data: { revokedAt: new Date() },
  });
  return true;
}

/**
 * Revoga todas as sessões do usuário exceto a atual.
 * Usa updateMany (permitido pelo PrismaPg).
 */
export async function revokeOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<void> {
  await prisma.userSessionMeta.updateMany({
    where: {
      userId,
      sessionId: { not: currentSessionId },
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Ping / lastSeenAt
// ---------------------------------------------------------------------------

/**
 * Atualiza lastSeenAt com throttle de 10 min.
 * Verifica ownership antes de atualizar.
 */
export async function pingSessionMeta(
  sessionId: string,
  userId: string
): Promise<void> {
  const meta = await prisma.userSessionMeta.findUnique({
    where: { sessionId },
    select: { userId: true, lastSeenAt: true, revokedAt: true },
  });
  if (!meta || meta.userId !== userId || meta.revokedAt) return;
  if (!shouldUpdateLastSeen(meta.lastSeenAt)) return;

  await prisma.userSessionMeta.update({
    where: { sessionId },
    data: { lastSeenAt: new Date() },
  });
}

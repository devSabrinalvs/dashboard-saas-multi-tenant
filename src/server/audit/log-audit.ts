import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type AuditAction =
  | "org.created"
  | "invite.created"
  | "invite.revoked"
  | "invite.accepted"
  | "member.role_updated"
  | "member.removed"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "task.created"
  | "task.updated"
  | "task.deleted";

export interface LogAuditParams {
  orgId: string;
  actorUserId: string | null;
  action: AuditAction;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Registra uma entrada no audit log de forma fire-and-forget.
 *
 * Se a gravação falhar (ex: DB indisponível), o erro é logado no console
 * mas NÃO interrompe o fluxo principal da requisição.
 *
 * Use: `void logAudit({ ... })` — sem await.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: params.orgId,
        actorUserId: params.actorUserId,
        action: params.action,
        metadata: params.metadata,
      },
    });
  } catch (err) {
    console.error("[audit] Falha ao registrar audit log:", {
      action: params.action,
      orgId: params.orgId,
      error: err,
    });
  }
}

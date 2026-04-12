/**
 * Cria uma notificação in-app para um usuário.
 * Best-effort: erros são silenciados para não bloquear a operação principal.
 */
import { prisma } from "@/lib/prisma";

export type NotificationType = "task.assigned" | "task.commented";

export interface CreateNotificationInput {
  userId: string;
  orgId: string;
  type: NotificationType;
  message: string;
  link?: string;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    await prisma.notification.create({ data: input });
  } catch {
    // best-effort — nunca bloqueia a operação principal
  }
}

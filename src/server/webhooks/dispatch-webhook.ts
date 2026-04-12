import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

export type WebhookEvent =
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "task.status_changed"
  | "project.created"
  | "project.deleted"
  | "member.invited"
  | "member.removed";

interface DispatchWebhookInput {
  orgId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}

/**
 * Envia o evento para todos os webhooks ativos da org que assinam este evento.
 * Best-effort e não-bloqueante — falhas são registradas mas não propagadas.
 */
export async function dispatchWebhook(input: DispatchWebhookInput): Promise<void> {
  try {
    const webhooks = await prisma.$queryRaw<{ id: string; url: string; secret: string }[]>`
      SELECT id, url, secret
      FROM "OrgWebhook"
      WHERE "orgId" = ${input.orgId}
        AND active = true
        AND ${input.event} = ANY(events)
    `;

    if (webhooks.length === 0) return;

    const body = JSON.stringify({
      event: input.event,
      timestamp: new Date().toISOString(),
      data: input.payload,
    });

    await Promise.allSettled(
      webhooks.map((wh) => deliverWebhook(wh.id, wh.url, wh.secret, input.event, body))
    );
  } catch {
    // best-effort
  }
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  event: string,
  body: string
): Promise<void> {
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  let statusCode: number | null = null;
  let error: string | null = null;
  let deliveredAt: Date | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SaaS-Event": event,
        "X-SaaS-Signature": `sha256=${sig}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    statusCode = res.status;
    if (res.ok) deliveredAt = new Date();
    else error = `HTTP ${res.status}`;
  } catch (err) {
    error = err instanceof Error ? err.message : "Network error";
  }

  try {
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload: JSON.parse(body) as Record<string, string | number | boolean | null>,
        statusCode,
        error,
        deliveredAt,
      },
    });
  } catch {
    // best-effort
  }
}

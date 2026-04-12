import { NextResponse } from "next/server";
import { spawnRecurringTasks } from "@/server/use-cases/spawn-recurring-tasks";

/**
 * GET /api/cron/recurring-tasks
 *
 * Cron job diário: verifica tarefas recorrentes e cria próximas ocorrências.
 *
 * Segurança:
 *  - Requer header Authorization: Bearer <CRON_SECRET>
 *  - Em dev (CRON_SECRET ausente), aceita qualquer request
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  console.info(`[recurring-tasks] Iniciando em ${now.toISOString()}`);

  try {
    const result = await spawnRecurringTasks(now);
    console.info(
      `[recurring-tasks] ${result.checked} verificadas, ${result.spawned} criadas, ${result.errors} erros`
    );
    return NextResponse.json({ ok: true, ...result, timestamp: now.toISOString() });
  } catch (err) {
    console.error("[recurring-tasks] Erro fatal:", err);
    return NextResponse.json({ error: "Erro interno no cron job" }, { status: 500 });
  }
}

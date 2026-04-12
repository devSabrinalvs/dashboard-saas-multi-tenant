import { NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/server/use-cases/send-weekly-digest";

/**
 * GET /api/cron/weekly-digest
 *
 * Cron job semanal: envia digest por email para todos os membros de todas as orgs.
 *
 * Segurança:
 *  - Requer header Authorization: Bearer <CRON_SECRET>
 *  - Em dev (CRON_SECRET ausente), aceita qualquer request
 *
 * Invocado por:
 *  - GitHub Actions schedule — toda segunda-feira às 07:00 UTC
 *  - Vercel Cron (opcional — ver vercel.json)
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
  console.info(`[weekly-digest] Iniciando digest em ${now.toISOString()}`);

  try {
    const result = await sendWeeklyDigest();
    console.info(
      `[weekly-digest] Concluído: ${result.orgsProcessed} orgs, ${result.emailsSent} emails, ${result.errors} erros`
    );
    return NextResponse.json({ ok: true, ...result, timestamp: now.toISOString() });
  } catch (err) {
    console.error("[weekly-digest] Erro fatal:", err);
    return NextResponse.json({ error: "Erro interno no cron job" }, { status: 500 });
  }
}

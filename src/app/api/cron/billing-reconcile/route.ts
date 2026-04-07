import { NextResponse } from "next/server";
import { applyExpiredGracePeriods } from "@/server/use-cases/billing/apply-grace-expiry";

/**
 * GET /api/cron/billing-reconcile
 *
 * Cron job diário: detecta orgs com grace period expirado e faz downgrade para FREE.
 *
 * Segurança:
 *  - Requer header Authorization: Bearer <CRON_SECRET>
 *  - CRON_SECRET deve estar configurado no ambiente de produção
 *  - Em dev (CRON_SECRET ausente), aceita qualquer request (útil para testes locais)
 *
 * Invocado por:
 *  - GitHub Actions schedule (.github/workflows/billing-cron.yml) — 1x/dia às 08:00 UTC
 *  - Vercel Cron (opcional — ver vercel.json)
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;

  // Verificar autorização apenas se CRON_SECRET estiver configurado
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  console.info(`[billing-cron] Iniciando reconciliação em ${now.toISOString()}`);

  try {
    const processed = await applyExpiredGracePeriods(now);
    console.info(`[billing-cron] ${processed} org(s) rebaixada(s) para FREE.`);
    return NextResponse.json({ ok: true, processed, timestamp: now.toISOString() });
  } catch (err) {
    console.error("[billing-cron] Erro na reconciliação:", err);
    return NextResponse.json(
      { error: "Erro interno no cron job" },
      { status: 500 }
    );
  }
}

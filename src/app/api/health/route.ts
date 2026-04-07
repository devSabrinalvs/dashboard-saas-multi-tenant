/**
 * GET /api/health
 *
 * Health check para monitoramento e load balancers.
 * Endpoint público (sem autenticação).
 *
 * Respostas:
 *   200 { ok: true,  db: "ok",    version, ts } — app + DB funcionando
 *   503 { ok: false, db: "error", version, ts } — DB inacessível
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Força execução dinâmica — nunca cacheado pelo Next.js
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const version =
    process.env.NEXT_PUBLIC_APP_VERSION ??
    process.env.npm_package_version ??
    "0.1.0";

  const ts = new Date().toISOString();

  try {
    // Query mínima para confirmar conectividade com o banco
    await prisma.$executeRaw`SELECT 1`;

    return NextResponse.json(
      { ok: true, db: "ok", version, ts },
      { status: 200 }
    );
  } catch (err) {
    console.error("[health] DB check failed:", err instanceof Error ? err.message : err);

    return NextResponse.json(
      { ok: false, db: "error", version, ts },
      { status: 503 }
    );
  }
}

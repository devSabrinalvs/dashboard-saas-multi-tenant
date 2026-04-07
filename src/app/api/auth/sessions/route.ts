/**
 * GET /api/auth/sessions
 * Retorna sessões ativas do usuário autenticado.
 * A sessão atual é identificada pelo sessionId do JWT.
 * sessionToken nunca é exposto.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { listActiveSessions } from "@/server/repo/session-meta-repo";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rows = await listActiveSessions(session.user.id);
  const currentSessionId = session.user.sessionId;

  const result = rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    isCurrent: row.sessionId === currentSessionId,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    ip: row.ip,
    deviceLabel: row.deviceLabel,
  }));

  return NextResponse.json(result);
}

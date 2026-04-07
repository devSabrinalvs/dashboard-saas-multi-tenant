/**
 * POST /api/auth/sessions/ping
 * Atualiza lastSeenAt da sessão atual (throttle de 10 min).
 * Chamado pelo client ao carregar o AppShell.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { pingSessionMeta } from "@/server/repo/session-meta-repo";

export async function POST(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.sessionId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await pingSessionMeta(session.user.sessionId, session.user.id);
  return NextResponse.json({ ok: true });
}

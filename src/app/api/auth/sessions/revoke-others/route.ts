/**
 * POST /api/auth/sessions/revoke-others
 * Revoga todas as sessões do usuário exceto a atual.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { revokeOtherSessions } from "@/server/repo/session-meta-repo";

export async function POST(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const currentSessionId = session.user.sessionId;
  if (!currentSessionId) {
    return NextResponse.json(
      { error: "Sessão atual não identificada." },
      { status: 400 }
    );
  }

  await revokeOtherSessions(session.user.id, currentSessionId);
  return NextResponse.json({ ok: true });
}

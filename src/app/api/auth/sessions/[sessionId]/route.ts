/**
 * DELETE /api/auth/sessions/[sessionId]
 * Revoga uma sessão específica do usuário autenticado.
 * Retorna { ok, isCurrent } — o client faz signOut se isCurrent = true.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { revokeSession } from "@/server/repo/session-meta-repo";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { sessionId } = await params;

  const revoked = await revokeSession(sessionId, session.user.id);
  if (!revoked) {
    return NextResponse.json(
      { error: "Sessão não encontrada." },
      { status: 404 }
    );
  }

  const isCurrent = sessionId === session.user.sessionId;
  return NextResponse.json({ ok: true, isCurrent });
}

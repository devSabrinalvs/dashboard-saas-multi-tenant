/**
 * POST /api/auth/2fa/setup-init
 * Inicia o wizard de setup de 2FA: gera TOTP secret + QR code.
 * Requer sessão autenticada (sem twoFactorPending).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { initTwoFactorSetup } from "@/server/use-cases/setup-two-factor";

export async function POST(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (session.user.twoFactorPending) {
    return NextResponse.json({ error: "Sessão pendente de 2FA." }, { status: 403 });
  }

  try {
    const result = await initTwoFactorSetup(session.user.id, session.user.email ?? "");
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/auth/2fa/setup-init]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

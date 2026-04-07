/**
 * POST /api/auth/2fa/setup-confirm
 * Confirma o setup de 2FA: valida código TOTP + ativa + retorna recovery codes.
 * Requer sessão autenticada (sem twoFactorPending).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { setupConfirmSchema } from "@/schemas/two-factor";
import { confirmTwoFactorSetup } from "@/server/use-cases/setup-two-factor";
import { InvalidTotpError } from "@/server/errors/auth-errors";

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (session.user.twoFactorPending) {
    return NextResponse.json({ error: "Sessão pendente de 2FA." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = setupConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  try {
    const result = await confirmTwoFactorSetup(session.user.id, parsed.data.code);
    return NextResponse.json({ recoveryCodes: result.recoveryCodes });
  } catch (err) {
    if (err instanceof InvalidTotpError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[POST /api/auth/2fa/setup-confirm]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

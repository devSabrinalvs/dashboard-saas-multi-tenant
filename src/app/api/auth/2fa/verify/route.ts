/**
 * POST /api/auth/2fa/verify
 * Verifica o código TOTP (ou recovery code) durante o desafio de login 2FA.
 * Requer sessão com twoFactorPending=true.
 *
 * Resposta:
 *   { nonce: string } — cliente usa para session.update({ nonce }) e upgrade do JWT
 *
 * Se rememberDevice=true:
 *   Seta cookie HttpOnly `td_token` (30 dias) com o token raw do trusted device.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { verifyTwoFactorSchema } from "@/schemas/two-factor";
import { verifyTwoFactorLogin } from "@/server/use-cases/verify-two-factor-login";
import { InvalidTotpError } from "@/server/errors/auth-errors";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { twoFaVerifyKey, getClientIp } from "@/security/rate-limit/keys";

const TRUSTED_DEVICE_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias em segundos

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);

  // Só permite se houver sessão pendente de 2FA
  if (!session?.user?.id || !session.user.twoFactorPending) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // Rate limit por userId
  const rl = await rateLimit(twoFaVerifyKey(session.user.id), RATE_LIMITS.TWO_FA_VERIFY);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 1 minuto." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = verifyTwoFactorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { code, isRecoveryCode, rememberDevice } = parsed.data;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "desconhecido";

  try {
    const result = await verifyTwoFactorLogin({
      userId: session.user.id,
      code,
      isRecoveryCode,
      rememberDevice,
      userAgent,
      ip,
    });

    const response = NextResponse.json({ nonce: result.nonce });

    // Se trusted device solicitado, seta cookie HttpOnly
    if (result.trustedDeviceToken) {
      response.cookies.set("td_token", result.trustedDeviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: TRUSTED_DEVICE_MAX_AGE,
        path: "/",
      });
    }

    return response;
  } catch (err) {
    if (err instanceof InvalidTotpError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[POST /api/auth/2fa/verify]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

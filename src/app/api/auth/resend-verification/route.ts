import { NextResponse } from "next/server";
import { resendVerificationSchema } from "@/schemas/auth";
import { verifyTurnstile } from "@/server/auth/turnstile";
import { resendVerification } from "@/server/use-cases/resend-verification";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import {
  resendIpKey,
  resendEmailKey,
  getClientIp,
} from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

const GENERIC_SUCCESS = {
  message:
    "Se existir uma conta não verificada com este email, enviaremos um link de verificação.",
};

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Rate limit por IP
  const ip = getClientIp(req);
  const ipRl = await rateLimit(resendIpKey(ip), RATE_LIMITS.RESEND_IP);
  if (!ipRl.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  // 2. Parse e validação do body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = resendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { email, turnstileToken } = parsed.data;

  // 3. Rate limit por email
  const emailRl = await rateLimit(
    resendEmailKey(email),
    RATE_LIMITS.RESEND_EMAIL
  );
  if (!emailRl.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  // 4. Verificação Turnstile
  const turnstileOk = await verifyTurnstile(turnstileToken);
  if (!turnstileOk) {
    return NextResponse.json(
      { error: "Verificação anti-bot falhou. Tente novamente." },
      { status: 400 }
    );
  }

  // 5. Reenviar verificação — resposta SEMPRE genérica (sem vazar se email existe)
  try {
    await resendVerification(email);
  } catch (err) {
    console.error("[POST /api/auth/resend-verification]", err);
  }

  return NextResponse.json(GENERIC_SUCCESS, { status: 200 });
}

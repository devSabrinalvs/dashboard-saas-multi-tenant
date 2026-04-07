import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/schemas/auth";
import { verifyTurnstile } from "@/server/auth/turnstile";
import { forgotPassword } from "@/server/use-cases/forgot-password";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import {
  forgotIpKey,
  forgotEmailKey,
  getClientIp,
} from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

const GENERIC_SUCCESS = {
  message:
    "Se existir uma conta verificada com este email, enviaremos um link para redefinir sua senha.",
};

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Rate limit por IP
  const ip = getClientIp(req);
  const ipRl = await rateLimit(forgotIpKey(ip), RATE_LIMITS.FORGOT_IP);
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

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { email, turnstileToken } = parsed.data;

  // 3. Rate limit por email
  const emailRl = await rateLimit(
    forgotEmailKey(email),
    RATE_LIMITS.FORGOT_EMAIL
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

  // 5. Iniciar reset — resposta SEMPRE genérica (sem vazar se email existe)
  try {
    await forgotPassword(email);
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
  }

  return NextResponse.json(GENERIC_SUCCESS, { status: 200 });
}

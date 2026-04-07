import { NextResponse } from "next/server";
import { signupSchema } from "@/schemas/auth";
import { verifyTurnstile } from "@/server/auth/turnstile";
import { EmailAlreadyExistsError } from "@/server/errors/auth-errors";
import { registerUser } from "@/server/use-cases/register-user";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import {
  signupIpKey,
  signupEmailKey,
  getClientIp,
} from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Rate limit por IP
  const ip = getClientIp(req);
  const ipRl = await rateLimit(signupIpKey(ip), RATE_LIMITS.SIGNUP_IP);
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

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { email, name, password, turnstileToken } = parsed.data;

  // 3. Rate limit por email
  const emailRl = await rateLimit(
    signupEmailKey(email),
    RATE_LIMITS.SIGNUP_EMAIL
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

  // 5. Registrar usuário
  try {
    const result = await registerUser({ name, email, password });
    return NextResponse.json({ email: result.email }, { status: 201 });
  } catch (err) {
    if (err instanceof EmailAlreadyExistsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    );
  }
}

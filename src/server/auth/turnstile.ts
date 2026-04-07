/**
 * Validação server-side do Cloudflare Turnstile.
 *
 * Se TURNSTILE_SECRET_KEY não estiver definida (dev sem configuração),
 * retorna true — graceful degradation para desenvolvimento local.
 *
 * Em produção, TURNSTILE_SECRET_KEY é obrigatória.
 */

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes": string[];
  challenge_ts: string;
  hostname: string;
}

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    // Dev sem Turnstile configurado: aceita tudo
    return true;
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return false;

  const data = (await res.json()) as TurnstileVerifyResponse;
  return data.success === true;
}

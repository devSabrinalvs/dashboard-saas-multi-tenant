import { NextResponse } from "next/server";
import { findUserByEmail } from "@/server/repo/user-repo";
import { isAccountLocked } from "@/server/security/login-lockout";

/**
 * POST /api/auth/email-status
 * Chamado pelo login form quando as credenciais falham.
 * Retorna o estado da conta para permitir mensagens de erro específicas na UI:
 *   - notVerified: email registrado mas aguardando verificação
 *   - locked: conta temporariamente bloqueada por muitas tentativas
 *   - lockedUntilMs: timestamp (ms epoch) de expiração do bloqueio
 *
 * Deliberadamente não confirma se o email existe para emails que NÃO passam
 * por nenhuma das condições acima (retorna tudo false).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const defaultResponse = { notVerified: false, locked: false, lockedUntilMs: null };

  let email: string;
  try {
    const body = await req.json() as { email?: unknown };
    email = String(body.email ?? "").toLowerCase().trim();
  } catch {
    return NextResponse.json(defaultResponse);
  }

  if (!email) return NextResponse.json(defaultResponse);

  const user = await findUserByEmail(email);

  if (!user) return NextResponse.json(defaultResponse);

  // Conta bloqueada?
  if (isAccountLocked(user.lockedUntil)) {
    return NextResponse.json({
      notVerified: false,
      locked: true,
      lockedUntilMs: user.lockedUntil!.getTime(),
    });
  }

  // Email não verificado?
  if (!user.emailVerified) {
    return NextResponse.json({ notVerified: true, locked: false, lockedUntilMs: null });
  }

  return NextResponse.json(defaultResponse);
}

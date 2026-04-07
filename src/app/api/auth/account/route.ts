/**
 * DELETE /api/auth/account
 * Deleta (soft delete) a conta do usuário autenticado.
 *
 * Body: { confirmText, password?, totpCode? }
 *
 * Erros:
 *   400 INVALID_CONFIRM    — confirmText inválido
 *   400 WRONG_PASSWORD     — senha incorreta
 *   400 WRONG_TOTP         — código TOTP inválido
 *   400 RECENT_LOGIN_REQUIRED — Google-only sem 2FA: login > 10 min atrás
 *   409 LAST_OWNER         — único owner de uma org (transfira antes)
 *   429                    — rate limit (3/dia)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { deleteAccountKey } from "@/security/rate-limit/keys";
import { deleteAccount } from "@/server/use-cases/delete-account";
import { validateCsrfRequest } from "@/lib/csrf";

const bodySchema = z.object({
  confirmText: z.string().min(1),
  password: z.string().optional(),
  totpCode: z
    .string()
    .length(6)
    .regex(/^\d{6}$/)
    .optional(),
});

const ERROR_STATUS: Record<string, number> = {
  INVALID_CONFIRM: 400,
  WRONG_PASSWORD: 400,
  WRONG_TOTP: 400,
  RECENT_LOGIN_REQUIRED: 400,
  LAST_OWNER: 409,
  USER_NOT_FOUND: 404,
};

const ERROR_MESSAGE: Record<string, string> = {
  INVALID_CONFIRM: "Confirmação inválida. Digite seu email ou DELETE.",
  WRONG_PASSWORD: "Senha incorreta.",
  WRONG_TOTP: "Código de autenticador inválido.",
  RECENT_LOGIN_REQUIRED:
    "Para deletar sua conta, faça login novamente (máx. 10 minutos).",
  LAST_OWNER:
    "Você é o único administrador de uma ou mais organizações. Transfira a propriedade antes de deletar sua conta.",
  USER_NOT_FOUND: "Usuário não encontrado.",
};

export async function DELETE(req: Request): Promise<NextResponse> {
  // 1. CSRF — double-submit cookie
  if (!validateCsrfRequest(req)) {
    return NextResponse.json({ error: "Token CSRF inválido." }, { status: 403 });
  }

  // 2. Autenticação
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // 3. Rate limit
  const rl = await rateLimit(
    deleteAccountKey(session.user.id),
    RATE_LIMITS.DELETE_ACCOUNT
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente amanhã." },
      { status: 429 }
    );
  }

  // 4. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  // 5. Executar use-case
  const result = await deleteAccount({
    userId: session.user.id,
    userEmail: session.user.email,
    sessionId: session.user.sessionId,
    confirmText: parsed.data.confirmText,
    password: parsed.data.password,
    totpCode: parsed.data.totpCode,
  });

  if (!result.ok) {
    const status = ERROR_STATUS[result.error] ?? 400;
    const message = ERROR_MESSAGE[result.error] ?? "Erro ao deletar conta.";
    return NextResponse.json({ error: message, code: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}

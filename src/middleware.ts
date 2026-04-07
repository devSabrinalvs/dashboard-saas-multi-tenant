import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { CSRF_COOKIE } from "@/lib/csrf";

/**
 * Middleware de autenticação + 2FA + CSRF:
 *
 * 1. Rotas protegidas (/org/*, /settings/*):
 *    - Sem sessão              → redirect /login
 *    - twoFactorPending=true  → redirect /2fa/verify
 *    - Sessão completa         → deixa passar
 *
 * 2. Rota /2fa/verify:
 *    - Sem sessão              → redirect /login
 *    - twoFactorPending=false  → redirect /org/select (já autenticado)
 *    - twoFactorPending=true   → deixa passar
 *
 * 3. CSRF cookie (double-submit):
 *    - Se o cookie csrf_token não existir, gera um token aleatório e define
 *      o cookie (não-HttpOnly, SameSite=Lax) na resposta.
 *    - O client lê o valor e o envia como header `x-csrf-token` em mutações.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const isProtected =
    pathname.startsWith("/org") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin");
  const is2faVerify = pathname.startsWith("/2fa/verify");

  // ── Rotas protegidas ──────────────────────────────────────────────────────
  if (isProtected) {
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.twoFactorPending) {
      const verifyUrl = req.nextUrl.clone();
      verifyUrl.pathname = "/2fa/verify";
      verifyUrl.search = "";
      return NextResponse.redirect(verifyUrl);
    }
  }

  // ── Página de verificação 2FA ─────────────────────────────────────────────
  if (is2faVerify) {
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }

    if (!token.twoFactorPending) {
      const selectUrl = req.nextUrl.clone();
      selectUrl.pathname = "/org/select";
      selectUrl.search = "";
      return NextResponse.redirect(selectUrl);
    }
  }

  // ── CSRF cookie (double-submit) ───────────────────────────────────────────
  const response = NextResponse.next();

  if (!req.cookies.get(CSRF_COOKIE)) {
    // crypto.randomUUID() está disponível no Edge Runtime
    const csrfToken = crypto.randomUUID().replace(/-/g, "");
    response.cookies.set(CSRF_COOKIE, csrfToken, {
      httpOnly: false,           // Deve ser legível pelo JS do cliente
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,     // 24 horas
    });
  }

  return response;
}

export const config = {
  matcher: ["/org/:path*", "/settings/:path*", "/2fa/verify", "/admin/:path*"],
};

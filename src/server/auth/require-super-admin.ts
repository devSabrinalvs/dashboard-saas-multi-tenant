/**
 * Autorização do Admin Console interno.
 *
 * Apenas emails listados em ADMIN_ALLOWLIST têm acesso.
 * Formato: variável de ambiente separada por vírgulas.
 *   ADMIN_ALLOWLIST="admin@empresa.com,suporte@empresa.com"
 *
 * Se ADMIN_ALLOWLIST não estiver definido, nenhum acesso é concedido
 * (fail-closed por segurança).
 *
 * Opcionalmente, se ADMIN_REQUIRE_2FA=true, o usuário precisa ter
 * twoFactorEnabled=true para acessar o console.
 *
 * Retorna 404 em vez de 403 para não vazar a existência da área admin.
 */

import { notFound } from "next/navigation";
import { getSession } from "@/auth";
import { findSessionMeta } from "@/server/repo/session-meta-repo";
import { prisma } from "@/lib/prisma";
export { parseAdminAllowlist, isAdminAllowed } from "./admin-allowlist";
import { parseAdminAllowlist, isAdminAllowed } from "./admin-allowlist";

export interface AdminContext {
  userId: string;
  email: string;
  sessionId: string | undefined;
}

/**
 * Garante que o usuário autenticado é um super admin.
 *
 * - Sem sessão → 404
 * - Sessão revogada → 404
 * - Email não na allowlist → 404
 * - ADMIN_REQUIRE_2FA=true e 2FA não ativo → 404
 *
 * Retorna 404 (não 403) para não vazar a existência do painel admin.
 */
export async function requireSuperAdmin(): Promise<AdminContext> {
  const session = await getSession();
  if (!session) notFound();

  const { sessionId } = session.user;

  if (sessionId) {
    const meta = await findSessionMeta(sessionId);
    if (meta?.revokedAt) notFound();
  }

  const email = session.user.email ?? "";
  const allowlist = parseAdminAllowlist(process.env.ADMIN_ALLOWLIST);

  if (!isAdminAllowed(email, allowlist)) notFound();

  // Requer 2FA se configurado — consulta o DB para obter twoFactorEnabled
  if (process.env.ADMIN_REQUIRE_2FA === "true") {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });
    if (!dbUser?.twoFactorEnabled) notFound();
  }

  return {
    userId: session.user.id,
    email,
    sessionId,
  };
}

/**
 * Versão para Route Handlers (retorna Response em vez de notFound()).
 * Usar nos endpoints /api/admin/*.
 */
export async function requireSuperAdminForApi(): Promise<
  AdminContext | Response
> {
  const session = await getSession();
  if (!session) return new Response(null, { status: 404 });

  const { sessionId } = session.user;

  if (sessionId) {
    const meta = await findSessionMeta(sessionId);
    if (meta?.revokedAt) return new Response(null, { status: 404 });
  }

  const email = session.user.email ?? "";
  const allowlist = parseAdminAllowlist(process.env.ADMIN_ALLOWLIST);

  if (!isAdminAllowed(email, allowlist)) return new Response(null, { status: 404 });

  if (process.env.ADMIN_REQUIRE_2FA === "true") {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });
    if (!dbUser?.twoFactorEnabled) return new Response(null, { status: 404 });
  }

  return {
    userId: session.user.id,
    email,
    sessionId,
  };
}

/** Type guard para distinguir AdminContext de Response. */
export function isAdminContext(
  result: AdminContext | Response
): result is AdminContext {
  return !(result instanceof Response);
}

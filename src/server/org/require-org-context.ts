import { notFound } from "next/navigation";
import { requireAuth } from "@/server/auth/require-auth";
import { findOrgBySlug } from "@/server/repo/organization-repo";
import { findMembership } from "@/server/repo/membership-repo";
import type { Role } from "@/generated/prisma/client";

export type OrgContext = {
  userId: string;
  email: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  /** Role do usuário nesta organização. RBAC completo vem na Etapa 4. */
  role: Role;
};

/**
 * Resolve o contexto de tenant a partir de um orgSlug de rota.
 *
 * 1. Garante que há sessão ativa (requireAuth).
 * 2. Busca a organização pelo slug — 404 se não existir.
 * 3. Verifica membership do usuário — 404 se não for membro.
 *    (404 em vez de 403 para não expor a existência da org.)
 *
 * Deve ser chamado no início de qualquer Server Component ou
 * Route Handler que precise de contexto de tenant.
 */
export async function requireOrgContext(orgSlug: string): Promise<OrgContext> {
  const auth = await requireAuth();

  const org = await findOrgBySlug(orgSlug);
  if (!org) notFound();

  const membership = await findMembership(auth.userId, org.id);
  if (!membership) notFound();

  return {
    userId: auth.userId,
    email: auth.email,
    orgId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    role: membership.role,
  };
}

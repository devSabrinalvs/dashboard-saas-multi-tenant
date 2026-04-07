/**
 * /auth/continue — Roteador pós-login.
 *
 * Decide automaticamente para onde mandar o usuário após autenticação:
 *
 *   0 orgs  → /org/new          (criar primeira organização)
 *   1 org   → /org/[slug]/dashboard
 *   >1 orgs → /org/select       (escolher organização)
 *
 * TODO: quando existir endpoint de convites pendentes por email,
 *       checar PRIMEIRO os convites e exibir tela "Você foi convidado"
 *       antes de redirecionar para org.
 *
 * Nota: requireAuth() já é chamado pelo (app)/layout.tsx — não precisa
 * ser chamado novamente aqui, mas importamos para obter o userId.
 */
import { redirect } from "next/navigation";
import { requireAuth } from "@/server/auth/require-auth";
import { findOrgsByUserId } from "@/server/repo/organization-repo";

export default async function AuthContinuePage() {
  const auth = await requireAuth();
  const orgs = await findOrgsByUserId(auth.userId);

  if (orgs.length === 0) {
    redirect("/org/new");
  }

  if (orgs.length === 1) {
    redirect(`/org/${orgs[0]!.slug}/dashboard`);
  }

  redirect("/org/select");
}

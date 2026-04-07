import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { findSessionMeta } from "@/server/repo/session-meta-repo";

export type AuthContext = {
  userId: string;
  email: string;
  /** ID opaco da sessão atual — undefined para sessões legadas (pré-Etapa F). */
  sessionId: string | undefined;
};

/**
 * Garante que há uma sessão ativa e não revogada.
 *
 * - Sem sessão → redirect /login
 * - sessionId presente e revogado no DB → redirect /login?revoked=1
 * - sessionId ausente (sessão legada) → passa sem checar revogação
 *
 * Deve ser chamado apenas em Server Components e Route Handlers.
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await getSession();
  if (!session) redirect("/login");

  const { sessionId } = session.user;

  // Checa revogação (sessões criadas após Etapa F têm sessionId)
  if (sessionId) {
    const meta = await findSessionMeta(sessionId);
    if (meta?.revokedAt) redirect("/login?revoked=1");
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    sessionId,
  };
}

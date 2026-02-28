import { redirect } from "next/navigation";
import { getSession } from "@/auth";

export type AuthContext = {
  userId: string;
  email: string;
};

/**
 * Garante que há uma sessão ativa.
 * Redireciona para /login se não houver.
 * Deve ser chamado apenas em Server Components e Route Handlers.
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await getSession();
  if (!session) redirect("/login");

  return {
    userId: session.user.id,
    email: session.user.email ?? "",
  };
}

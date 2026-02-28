import { withAuth } from "next-auth/middleware";

/**
 * Middleware de autenticação: verifica apenas se existe sessão JWT válida.
 * Não faz queries no DB — resolução de org e membership é feita
 * nos Server Components via requireOrgContext().
 *
 * Rotas protegidas:
 *  - /org/* → inclui /org/select e /org/[orgSlug]/**
 */
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/org/:path*"],
};

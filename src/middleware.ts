import { withAuth } from "next-auth/middleware";

/**
 * Protege todas as rotas do grupo (app).
 * Se não estiver autenticado, redireciona para /login.
 * Funciona via cookie HttpOnly do next-auth (JWT).
 */
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};

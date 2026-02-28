/**
 * Estende os tipos padrão do next-auth para incluir o campo `id`
 * na sessão e no token JWT. Sem isso, `session.user.id` causaria
 * erro de TypeScript.
 */
import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
  }
}

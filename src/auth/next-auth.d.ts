/**
 * Estende os tipos padrão do next-auth para incluir campos customizados
 * na sessão e no token JWT.
 */
import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** ID opaco da sessão atual — armazenado no JWT e em UserSessionMeta. */
      sessionId?: string;
      /** True enquanto o segundo fator (2FA) ainda não foi validado nesta sessão. */
      twoFactorPending?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    /** Passado pelo authorize para indicar que o dispositivo é de confiança (pula 2FA). */
    trustedDevice?: boolean;
    /** Passado internamente de authorize → jwt callback. Nunca exposto ao client. */
    _ip?: string;
    /** Passado internamente de authorize → jwt callback. Nunca exposto ao client. */
    _userAgent?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    /** ID opaco da sessão — correlaciona o JWT com UserSessionMeta no DB. */
    sessionId?: string;
    /** True enquanto o segundo fator ainda não foi completado nesta sessão. */
    twoFactorPending?: boolean;
    /** Nonce único da sessão — correlaciona o JWT com o TwoFactorVerification no DB. */
    sessionNonce?: string;
  }
}

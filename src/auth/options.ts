import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/server/auth/password";
import { z } from "zod";
import { createHash, randomUUID } from "crypto";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { RATE_LIMITS } from "@/security/rate-limit/constants";
import { loginIpKey, loginEmailKey, extractIpFromAuthorizeHeaders } from "@/security/rate-limit/keys";
import { isAccountLocked, computeLockedUntil } from "@/server/security/login-lockout";
import { shouldSendAlert, sendLoginSecurityAlert } from "@/server/security/security-alerts";
import { parseDeviceLabel } from "@/server/security/session-utils";
import {
  incrementFailedLogin,
  resetLoginCounters,
  updateLastSecurityAlertAt,
} from "@/server/repo/user-repo";
import {
  findUserTwoFactorData,
  validateTrustedDevice,
  consumeTwoFactorVerification,
} from "@/server/repo/two-factor-repo";
import { createSessionMeta } from "@/server/repo/session-meta-repo";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/** Parseia o cookie `td_token` do header Cookie da request. */
function parseTdToken(cookieHeader: string | string[] | undefined): string | null {
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : (cookieHeader ?? "");
  const match = raw.match(/(?:^|;\s*)td_token=([^;]+)/);
  return match?.[1] ?? null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        // ── Rate limit por IP ──────────────────────────────────────────────
        const ip = extractIpFromAuthorizeHeaders(
          req.headers as Record<string, string | string[] | undefined>
        );
        const rlIp = await rateLimit(loginIpKey(ip), RATE_LIMITS.LOGIN_IP);
        if (!rlIp.ok) return null;

        // ── Rate limit por email ───────────────────────────────────────────
        const rlEmail = await rateLimit(loginEmailKey(normalizedEmail), RATE_LIMITS.LOGIN_EMAIL);
        if (!rlEmail.ok) return null;

        // ── Buscar usuário ─────────────────────────────────────────────────
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            emailVerified: true,
            failedLoginCount: true,
            lockedUntil: true,
            lastSecurityAlertAt: true,
            deletedAt: true,
          },
        });

        // Sem usuário ou sem senha (OAuth) → resposta genérica
        if (!user?.password) return null;

        // ── Conta soft-deletada ────────────────────────────────────────────
        if (user.deletedAt) return null;

        // ── Verificar lockout ──────────────────────────────────────────────
        if (isAccountLocked(user.lockedUntil)) {
          return null;
        }

        // ── Verificar senha ────────────────────────────────────────────────
        const passwordMatches = await verifyPassword(password, user.password);

        if (!passwordMatches) {
          const newCount = user.failedLoginCount + 1;
          const newLockedUntil = computeLockedUntil(newCount);

          await incrementFailedLogin(user.id, newLockedUntil);

          if (newLockedUntil && shouldSendAlert(user.lastSecurityAlertAt)) {
            const rawUa = req.headers?.["user-agent"];
            const userAgent = Array.isArray(rawUa) ? rawUa[0] : (rawUa ?? "desconhecido");
            void sendLoginSecurityAlert(
              { email: user.email },
              { ip, userAgent }
            );
            updateLastSecurityAlertAt(user.id).catch((err) => {
              console.error("[auth] Falha ao atualizar lastSecurityAlertAt:", err);
            });
          }

          return null;
        }

        // ── Email não verificado ───────────────────────────────────────────
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // ── Sucesso — resetar contadores ───────────────────────────────────
        await resetLoginCounters(user.id);

        // ── Verificar trusted device ───────────────────────────────────────
        const tdRaw = parseTdToken(req.headers?.["cookie"]);
        let hasTrustedDevice = false;
        if (tdRaw) {
          const tdHash = createHash("sha256").update(tdRaw).digest("hex");
          hasTrustedDevice = await validateTrustedDevice(user.id, tdHash);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          trustedDevice: hasTrustedDevice,
          _ip: ip,
          _userAgent: Array.isArray(req.headers?.["user-agent"])
            ? (req.headers["user-agent"] as string[])[0]
            : ((req.headers?.["user-agent"] as string | undefined) ?? ""),
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Bloqueia login de usuários soft-deletados via OAuth (Google, etc.).
     * Para Credentials, authorize() já faz essa checagem.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "credentials" && user.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { deletedAt: true },
        });
        if (dbUser?.deletedAt) return false;
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // ── Login inicial ──────────────────────────────────────────────────
      if (user) {
        token.id = user.id;

        // Gerar sessionId opaco e persistir metadata (fire-and-forget)
        const sessionId = randomUUID();
        token.sessionId = sessionId;
        const { _ip, _userAgent } = user as { _ip?: string; _userAgent?: string };
        createSessionMeta({
          userId: user.id,
          sessionId,
          ip: _ip ?? null,
          userAgent: _userAgent ?? null,
          deviceLabel: parseDeviceLabel(_userAgent),
        }).catch((err) => {
          console.error("[auth] Falha ao criar session meta:", err);
        });

        // Se trusted device válido, skip 2FA check
        if ((user as { trustedDevice?: boolean }).trustedDevice) {
          token.twoFactorPending = false;
        } else {
          // Verificar se o usuário tem 2FA ativo
          const twoFactorData = await findUserTwoFactorData(user.id);
          token.twoFactorPending = twoFactorData?.twoFactorEnabled ?? false;
        }
      }

      // ── session.update({ nonce }) → upgrade do token após verificação 2FA ──
      if (trigger === "update" && typeof session?.nonce === "string" && token.id) {
        const consumed = await consumeTwoFactorVerification(
          token.id as string,
          session.nonce as string
        );
        if (consumed) {
          token.twoFactorPending = false;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      if (token.sessionId) {
        session.user.sessionId = token.sessionId as string;
      }
      if (token.twoFactorPending !== undefined) {
        session.user.twoFactorPending = token.twoFactorPending as boolean;
      }
      return session;
    },
  },
};

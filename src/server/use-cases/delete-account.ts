/**
 * Use-case de deleção de conta (soft delete).
 *
 * Fluxo:
 * 1. Validar confirmText (email do usuário ou "DELETE")
 * 2. Verificar que não é o único OWNER ativo de nenhuma org
 * 3. Reautenticar (senha, TOTP ou login recente)
 * 4. Soft delete + revogar sessões/devices
 */

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/server/auth/password";
import { verifyTotpCode } from "@/server/security/totp";
import { decrypt } from "@/server/security/crypto";
import { softDeleteUser } from "@/server/repo/account-repo";
import { getSessionCreatedAt } from "@/server/repo/session-meta-repo";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Janela de "login recente" permitida para Google-only sem 2FA. */
export const RECENT_LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutos

// ---------------------------------------------------------------------------
// Helpers puros (sem DB — testáveis em unit tests)
// ---------------------------------------------------------------------------

/**
 * Valida o texto de confirmação.
 * Aceita o email exato do usuário OU a string "DELETE" (maiúsculas).
 */
export function isValidConfirmText(text: string, email: string): boolean {
  return text === email || text === "DELETE";
}

/**
 * Determina o método de reautenticação necessário com base nos dados do usuário.
 * - "password"    → usuário Credentials (tem senha)
 * - "totp"        → usuário OAuth sem senha, mas com 2FA ativo
 * - "recentLogin" → usuário OAuth sem senha e sem 2FA
 */
export function getReauthMethodType(user: {
  password: string | null;
  twoFactorEnabled: boolean;
}): "password" | "totp" | "recentLogin" {
  if (user.password) return "password";
  if (user.twoFactorEnabled) return "totp";
  return "recentLogin";
}

/**
 * Verifica se o login foi feito nos últimos RECENT_LOGIN_WINDOW_MS ms.
 * Retorna false se loginAt for null (login desconhecido = não recente).
 */
export function isRecentLogin(
  loginAt: Date | null,
  now: Date = new Date()
): boolean {
  if (!loginAt) return false;
  return now.getTime() - loginAt.getTime() <= RECENT_LOGIN_WINDOW_MS;
}

// ---------------------------------------------------------------------------
// Verificação "último owner" — impede exclusão se deixar org sem dono
// ---------------------------------------------------------------------------

/**
 * Retorna true se o usuário é o único OWNER ativo (deletedAt IS NULL)
 * em pelo menos uma organização.
 * Nesse caso, a deleção deve ser bloqueada.
 */
export async function checkIsLastOwner(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ orgId: string }>>`
    SELECT DISTINCT m."orgId"
    FROM "Membership" m
    WHERE m."userId" = ${userId}
      AND m.role = 'OWNER'
      AND NOT EXISTS (
        SELECT 1
        FROM "Membership" m2
        INNER JOIN "User" u2 ON u2.id = m2."userId"
        WHERE m2."orgId" = m."orgId"
          AND m2."userId" != ${userId}
          AND m2.role = 'OWNER'
          AND u2."deletedAt" IS NULL
      )
  `;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Tipos de resultado
// ---------------------------------------------------------------------------

export type DeleteAccountError =
  | "INVALID_CONFIRM"
  | "LAST_OWNER"
  | "WRONG_PASSWORD"
  | "WRONG_TOTP"
  | "RECENT_LOGIN_REQUIRED"
  | "USER_NOT_FOUND";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: DeleteAccountError };

// ---------------------------------------------------------------------------
// Use-case principal
// ---------------------------------------------------------------------------

export async function deleteAccount(params: {
  userId: string;
  userEmail: string;
  sessionId: string | undefined;
  confirmText: string;
  password?: string;
  totpCode?: string;
}): Promise<DeleteAccountResult> {
  const { userId, userEmail, sessionId, confirmText, password, totpCode } = params;

  // 1. Validar confirmText
  if (!isValidConfirmText(confirmText, userEmail)) {
    return { ok: false, error: "INVALID_CONFIRM" };
  }

  // 2. Carregar dados do usuário
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      password: true,
      twoFactorEnabled: true,
      totpSecretEncrypted: true,
      lastLoginAt: true,
    },
  });
  if (!user) return { ok: false, error: "USER_NOT_FOUND" };

  // 3. Verificar último owner
  const isLastOwner = await checkIsLastOwner(userId);
  if (isLastOwner) return { ok: false, error: "LAST_OWNER" };

  // 4. Reautenticação
  const reauthMethod = getReauthMethodType(user);

  if (reauthMethod === "password") {
    if (!password) return { ok: false, error: "WRONG_PASSWORD" };
    const valid = await verifyPassword(password, user.password!);
    if (!valid) return { ok: false, error: "WRONG_PASSWORD" };
  } else if (reauthMethod === "totp") {
    if (!totpCode || !user.totpSecretEncrypted) {
      return { ok: false, error: "WRONG_TOTP" };
    }
    const secret = decrypt(user.totpSecretEncrypted);
    if (!verifyTotpCode(totpCode, secret)) {
      return { ok: false, error: "WRONG_TOTP" };
    }
  } else {
    // recentLogin — verificar sessionId.createdAt OU lastLoginAt
    const loginAt =
      sessionId ? await getSessionCreatedAt(sessionId) : user.lastLoginAt;
    if (!isRecentLogin(loginAt)) {
      return { ok: false, error: "RECENT_LOGIN_REQUIRED" };
    }
  }

  // 5. Soft delete + revogar tudo
  await softDeleteUser(userId);

  return { ok: true };
}

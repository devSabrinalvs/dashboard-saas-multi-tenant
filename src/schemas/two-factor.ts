import { z } from "zod";

const totpCodeSchema = z
  .string()
  .length(6, "Código deve ter 6 dígitos")
  .regex(/^\d{6}$/, "Código deve conter apenas números");

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/** Confirmar setup: valida o código TOTP antes de ativar o 2FA. */
export const setupConfirmSchema = z.object({
  code: totpCodeSchema,
});

export type SetupConfirmInput = z.infer<typeof setupConfirmSchema>;

// ---------------------------------------------------------------------------
// Disable
// ---------------------------------------------------------------------------

/** Desativar 2FA: requer código TOTP atual para confirmação. */
export const disableTwoFactorSchema = z.object({
  totpCode: totpCodeSchema,
});

export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorSchema>;

// ---------------------------------------------------------------------------
// Verify (login challenge)
// ---------------------------------------------------------------------------

/**
 * Verificar 2FA durante o login.
 * - `code`: 6 dígitos TOTP ou recovery code (formato "XXXX-XXXX")
 * - `isRecoveryCode`: true quando o usuário usa um recovery code
 * - `rememberDevice`: true para criar um trusted device (30 dias)
 */
export const verifyTwoFactorSchema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  isRecoveryCode: z.boolean().default(false),
  rememberDevice: z.boolean().default(false),
});

export type VerifyTwoFactorInput = z.infer<typeof verifyTwoFactorSchema>;

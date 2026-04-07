import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared password rule (same as client-side PasswordStrengthIndicator)
// ---------------------------------------------------------------------------

const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(128, "Máximo 128 caracteres")
  .refine((v) => /\d/.test(v), "Deve conter pelo menos 1 número")
  .refine(
    (v) => /[^a-zA-Z0-9]/.test(v),
    "Deve conter pelo menos 1 símbolo"
  );

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

export const signupSchema = z
  .object({
    name: z.string().max(100).optional(),
    email: z
      .string()
      .email("Email inválido")
      .transform((v) => v.toLowerCase().trim()),
    password: passwordSchema,
    confirmPassword: z.string(),
    turnstileToken: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

// ---------------------------------------------------------------------------
// Resend verification
// ---------------------------------------------------------------------------

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .transform((v) => v.toLowerCase().trim()),
  turnstileToken: z.string(),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .transform((v) => v.toLowerCase().trim()),
  turnstileToken: z.string(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token obrigatório"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

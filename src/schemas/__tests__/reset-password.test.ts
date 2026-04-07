/**
 * Testes unitários — forgotPasswordSchema e resetPasswordSchema (schemas/auth.ts)
 */
import { forgotPasswordSchema, resetPasswordSchema } from "@/schemas/auth";

// ---------------------------------------------------------------------------
// forgotPasswordSchema
// ---------------------------------------------------------------------------

describe("forgotPasswordSchema — casos válidos", () => {
  const valid = {
    email: "user@example.com",
    turnstileToken: "cf-token-abc",
  };

  it("aceita payload válido", () => {
    expect(forgotPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("normaliza email para lowercase", () => {
    const result = forgotPasswordSchema.safeParse({
      ...valid,
      email: "USER@EXAMPLE.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("user@example.com");
  });
});

describe("forgotPasswordSchema — casos inválidos", () => {
  const valid = { email: "user@example.com", turnstileToken: "tok" };

  it("rejeita email inválido", () => {
    const result = forgotPasswordSchema.safeParse({ ...valid, email: "nao-e-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(true);
    }
  });

  it("aceita turnstileToken vazio (validação real acontece no servidor via verifyTurnstile)", () => {
    // Comportamento intencional: schema aceita "" para graceful degradation em dev.
    expect(forgotPasswordSchema.safeParse({ ...valid, turnstileToken: "" }).success).toBe(true);
  });

  it("rejeita sem turnstileToken", () => {
    const result = forgotPasswordSchema.safeParse({ email: valid.email });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resetPasswordSchema
// ---------------------------------------------------------------------------

describe("resetPasswordSchema — casos válidos", () => {
  const valid = {
    token: "raw-token-hex",
    newPassword: "MinhaS3nh@",
    confirmPassword: "MinhaS3nh@",
  };

  it("aceita payload válido", () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });
});

describe("resetPasswordSchema — casos inválidos", () => {
  const valid = {
    token: "raw-token-hex",
    newPassword: "MinhaS3nh@",
    confirmPassword: "MinhaS3nh@",
  };

  it("rejeita token vazio", () => {
    const result = resetPasswordSchema.safeParse({ ...valid, token: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("token"))).toBe(true);
    }
  });

  it("rejeita senha fraca (sem número)", () => {
    const result = resetPasswordSchema.safeParse({
      ...valid,
      newPassword: "SenhaSemNumero!",
      confirmPassword: "SenhaSemNumero!",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha fraca (sem símbolo)", () => {
    const result = resetPasswordSchema.safeParse({
      ...valid,
      newPassword: "Senha12345678",
      confirmPassword: "Senha12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha fraca (muito curta)", () => {
    const result = resetPasswordSchema.safeParse({
      ...valid,
      newPassword: "S3nh@",
      confirmPassword: "S3nh@",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita confirmPassword divergente", () => {
    const result = resetPasswordSchema.safeParse({
      ...valid,
      confirmPassword: "SenhaDiferente1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("confirmPassword"))
      ).toBe(true);
    }
  });
});

/**
 * Testes unitários — signupSchema e resendVerificationSchema (schemas/auth.ts)
 */
import { signupSchema, resendVerificationSchema } from "@/schemas/auth";

// ---------------------------------------------------------------------------
// signupSchema
// ---------------------------------------------------------------------------

describe("signupSchema — casos válidos", () => {
  const valid = {
    email: "user@example.com",
    password: "MinhaS3nh@",
    confirmPassword: "MinhaS3nh@",
    turnstileToken: "cf-token-abc",
  };

  it("aceita payload completo sem name", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita payload com name opcional", () => {
    const result = signupSchema.safeParse({ ...valid, name: "João" });
    expect(result.success).toBe(true);
  });

  it("normaliza email para lowercase", () => {
    const result = signupSchema.safeParse({ ...valid, email: "USER@EXAMPLE.COM" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("user@example.com");
  });

  it("rejeita email com espaços (Zod .email() valida antes do .trim())", () => {
    // Zod valida com .email() antes de aplicar o transform — spaces rejeitadas
    const result = signupSchema.safeParse({ ...valid, email: "  user@example.com  " });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema — validação de email", () => {
  const base = {
    password: "MinhaS3nh@",
    confirmPassword: "MinhaS3nh@",
    turnstileToken: "tk",
  };

  it("rejeita email ausente", () => {
    expect(signupSchema.safeParse({ ...base }).success).toBe(false);
  });

  it("rejeita email com formato inválido", () => {
    expect(signupSchema.safeParse({ ...base, email: "nao-e-email" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, email: "@sem-local" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, email: "sem-arroba" }).success).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(signupSchema.safeParse({ ...base, email: "" }).success).toBe(false);
  });
});

describe("signupSchema — validação de senha", () => {
  const base = {
    email: "user@example.com",
    turnstileToken: "tk",
  };

  it("rejeita senha com menos de 8 caracteres", () => {
    expect(signupSchema.safeParse({ ...base, password: "Abc1!", confirmPassword: "Abc1!" }).success).toBe(false);
  });

  it("rejeita senha sem dígito", () => {
    expect(signupSchema.safeParse({ ...base, password: "SenhaSemDigito!", confirmPassword: "SenhaSemDigito!" }).success).toBe(false);
  });

  it("rejeita senha sem símbolo especial", () => {
    expect(signupSchema.safeParse({ ...base, password: "SenhaSemSimbol1", confirmPassword: "SenhaSemSimbol1" }).success).toBe(false);
  });

  it("rejeita senha com mais de 128 caracteres", () => {
    const long = "A1!" + "a".repeat(127);
    expect(signupSchema.safeParse({ ...base, password: long, confirmPassword: long }).success).toBe(false);
  });

  it("rejeita confirmPassword divergente", () => {
    expect(signupSchema.safeParse({
      ...base,
      password: "MinhaS3nh@",
      confirmPassword: "OutraSenha1!",
    }).success).toBe(false);
  });

  it("aceita senha no limite mínimo (8 chars, 1 dígito, 1 símbolo)", () => {
    expect(signupSchema.safeParse({
      ...base,
      password: "Abc1!xyz",
      confirmPassword: "Abc1!xyz",
    }).success).toBe(true);
  });
});

describe("signupSchema — turnstileToken", () => {
  const base = {
    email: "user@example.com",
    password: "MinhaS3nh@",
    confirmPassword: "MinhaS3nh@",
  };

  it("rejeita sem turnstileToken", () => {
    expect(signupSchema.safeParse(base).success).toBe(false);
  });

  it("aceita turnstileToken vazio (validação real acontece no servidor via verifyTurnstile)", () => {
    // Comportamento intencional: o schema aceita "" para graceful degradation em dev
    // (sem NEXT_PUBLIC_TURNSTILE_SITE_KEY, o widget emite onToken("")).
    expect(signupSchema.safeParse({ ...base, turnstileToken: "" }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resendVerificationSchema
// ---------------------------------------------------------------------------

describe("resendVerificationSchema — casos válidos", () => {
  it("aceita email + turnstileToken válidos", () => {
    const result = resendVerificationSchema.safeParse({
      email: "user@example.com",
      turnstileToken: "cf-token",
    });
    expect(result.success).toBe(true);
  });

  it("normaliza email para lowercase", () => {
    const result = resendVerificationSchema.safeParse({
      email: "USER@EXAMPLE.COM",
      turnstileToken: "tk",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("user@example.com");
  });
});

describe("resendVerificationSchema — validação", () => {
  it("rejeita sem email", () => {
    expect(resendVerificationSchema.safeParse({ turnstileToken: "tk" }).success).toBe(false);
  });

  it("rejeita email inválido", () => {
    expect(resendVerificationSchema.safeParse({ email: "nao-email", turnstileToken: "tk" }).success).toBe(false);
  });

  it("rejeita sem turnstileToken", () => {
    expect(resendVerificationSchema.safeParse({ email: "user@example.com" }).success).toBe(false);
  });

  it("aceita turnstileToken vazio (validação real acontece no servidor via verifyTurnstile)", () => {
    expect(resendVerificationSchema.safeParse({ email: "user@example.com", turnstileToken: "" }).success).toBe(true);
  });
});

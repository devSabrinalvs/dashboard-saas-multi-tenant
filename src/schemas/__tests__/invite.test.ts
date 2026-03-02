import { createInviteSchema, updateMemberRoleSchema } from "@/schemas/invite";

describe("createInviteSchema", () => {
  it("aceita email válido", () => {
    const result = createInviteSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("normaliza email para lowercase e remove espaços", () => {
    const result = createInviteSchema.safeParse({
      email: " User@Example.COM ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejeita email ausente", () => {
    const result = createInviteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejeita formato de email inválido", () => {
    const result = createInviteSchema.safeParse({ email: "nao-e-email" });
    expect(result.success).toBe(false);
  });

  it("rejeita string vazia", () => {
    const result = createInviteSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });
});

describe("updateMemberRoleSchema", () => {
  it.each(["OWNER", "ADMIN", "MEMBER", "VIEWER"])(
    "aceita role válido: %s",
    (role) => {
      const result = updateMemberRoleSchema.safeParse({ role });
      expect(result.success).toBe(true);
    }
  );

  it("rejeita role desconhecido", () => {
    const result = updateMemberRoleSchema.safeParse({ role: "SUPERADMIN" });
    expect(result.success).toBe(false);
  });

  it("rejeita role ausente", () => {
    const result = updateMemberRoleSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

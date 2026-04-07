/**
 * Unit tests para schemas/admin.ts
 */

import {
  adminUserSearchSchema,
  adminOrgSearchSchema,
  adminConfirmEmailSchema,
  adminForcePlanSchema,
  adminAuditQuerySchema,
} from "@/schemas/admin";

describe("adminUserSearchSchema", () => {
  it("aceita busca válida", () => {
    const result = adminUserSearchSchema.safeParse({ search: "user@email.com" });
    expect(result.success).toBe(true);
  });

  it("faz trim da busca", () => {
    const result = adminUserSearchSchema.safeParse({ search: "  user  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.search).toBe("user");
  });

  it("rejeita string vazia", () => {
    const result = adminUserSearchSchema.safeParse({ search: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita busca ausente", () => {
    const result = adminUserSearchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejeita busca maior que 200 chars", () => {
    const result = adminUserSearchSchema.safeParse({ search: "a".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("adminOrgSearchSchema", () => {
  it("aceita slug válido", () => {
    const result = adminOrgSearchSchema.safeParse({ search: "minha-org" });
    expect(result.success).toBe(true);
  });

  it("rejeita string vazia", () => {
    const result = adminOrgSearchSchema.safeParse({ search: "" });
    expect(result.success).toBe(false);
  });
});

describe("adminConfirmEmailSchema", () => {
  it("aceita email válido", () => {
    const result = adminConfirmEmailSchema.safeParse({ confirm: "user@email.com" });
    expect(result.success).toBe(true);
  });

  it("converte para lowercase e faz trim", () => {
    const result = adminConfirmEmailSchema.safeParse({ confirm: "  User@EMAIL.COM  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.confirm).toBe("user@email.com");
  });

  it("rejeita string vazia", () => {
    const result = adminConfirmEmailSchema.safeParse({ confirm: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita confirm ausente", () => {
    const result = adminConfirmEmailSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("adminForcePlanSchema", () => {
  it("aceita plan FREE com confirm", () => {
    const result = adminForcePlanSchema.safeParse({ plan: "FREE", confirm: "minha-org" });
    expect(result.success).toBe(true);
  });

  it("aceita plan PRO", () => {
    const result = adminForcePlanSchema.safeParse({ plan: "PRO", confirm: "minha-org" });
    expect(result.success).toBe(true);
  });

  it("aceita plan BUSINESS", () => {
    const result = adminForcePlanSchema.safeParse({ plan: "BUSINESS", confirm: "minha-org" });
    expect(result.success).toBe(true);
  });

  it("rejeita plan inválido", () => {
    const result = adminForcePlanSchema.safeParse({ plan: "ENTERPRISE", confirm: "minha-org" });
    expect(result.success).toBe(false);
  });

  it("rejeita confirm ausente", () => {
    const result = adminForcePlanSchema.safeParse({ plan: "PRO" });
    expect(result.success).toBe(false);
  });

  it("normaliza confirm para lowercase", () => {
    const result = adminForcePlanSchema.safeParse({ plan: "PRO", confirm: "MINHA-ORG" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.confirm).toBe("minha-org");
  });
});

describe("adminAuditQuerySchema", () => {
  it("usa defaults quando campos ausentes", () => {
    const result = adminAuditQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.search).toBe("");
      expect(result.data.action).toBe("");
    }
  });

  it("aceita page e pageSize customizados", () => {
    const result = adminAuditQuerySchema.safeParse({ page: "3", pageSize: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it("rejeita pageSize > 100", () => {
    const result = adminAuditQuerySchema.safeParse({ pageSize: "101" });
    expect(result.success).toBe(false);
  });

  it("rejeita page < 1", () => {
    const result = adminAuditQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("aceita filtros de search e action", () => {
    const result = adminAuditQuerySchema.safeParse({
      search: "admin@x.com",
      action: "admin.user.unlock",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("admin@x.com");
      expect(result.data.action).toBe("admin.user.unlock");
    }
  });
});

/**
 * Unit tests para require-super-admin.ts
 * Testa a lógica pura: parsing da allowlist e isAdminAllowed.
 * (requireSuperAdmin/requireSuperAdminForApi dependem de IO e não são testadas aqui)
 */

import { parseAdminAllowlist, isAdminAllowed } from "@/server/auth/admin-allowlist";

describe("parseAdminAllowlist", () => {
  it("retorna [] para undefined", () => {
    expect(parseAdminAllowlist(undefined)).toEqual([]);
  });

  it("retorna [] para string vazia", () => {
    expect(parseAdminAllowlist("")).toEqual([]);
  });

  it("retorna [] para string com apenas espaços", () => {
    expect(parseAdminAllowlist("   ")).toEqual([]);
  });

  it("parseia email único", () => {
    expect(parseAdminAllowlist("admin@empresa.com")).toEqual(["admin@empresa.com"]);
  });

  it("parseia múltiplos emails separados por vírgula", () => {
    expect(parseAdminAllowlist("a@x.com,b@y.com")).toEqual(["a@x.com", "b@y.com"]);
  });

  it("remove espaços em branco ao redor", () => {
    expect(parseAdminAllowlist("  a@x.com , b@y.com  ")).toEqual(["a@x.com", "b@y.com"]);
  });

  it("converte para lowercase", () => {
    expect(parseAdminAllowlist("Admin@Empresa.COM")).toEqual(["admin@empresa.com"]);
  });

  it("ignora entradas vazias entre vírgulas", () => {
    expect(parseAdminAllowlist("a@x.com,,b@y.com")).toEqual(["a@x.com", "b@y.com"]);
  });

  it("parseia lista com 3 emails", () => {
    const result = parseAdminAllowlist("a@x.com,b@y.com,c@z.com");
    expect(result).toHaveLength(3);
    expect(result).toContain("c@z.com");
  });
});

describe("isAdminAllowed", () => {
  const allowlist = ["admin@empresa.com", "suporte@empresa.com"];

  it("retorna true para email na allowlist", () => {
    expect(isAdminAllowed("admin@empresa.com", allowlist)).toBe(true);
  });

  it("retorna true case-insensitive", () => {
    expect(isAdminAllowed("ADMIN@EMPRESA.COM", allowlist)).toBe(true);
    expect(isAdminAllowed("Admin@Empresa.Com", allowlist)).toBe(true);
  });

  it("retorna false para email fora da allowlist", () => {
    expect(isAdminAllowed("hacker@evil.com", allowlist)).toBe(false);
  });

  it("retorna false para allowlist vazia", () => {
    expect(isAdminAllowed("admin@empresa.com", [])).toBe(false);
  });

  it("retorna false para email parcial", () => {
    expect(isAdminAllowed("admin", allowlist)).toBe(false);
  });

  it("é case-insensitive na comparação", () => {
    const mixedList = parseAdminAllowlist("Admin@Empresa.COM");
    expect(isAdminAllowed("admin@empresa.com", mixedList)).toBe(true);
  });
});

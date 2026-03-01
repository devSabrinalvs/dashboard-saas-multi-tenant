import { slugify } from "@/shared/utils/slugify";

describe("slugify()", () => {
  // --- Casos do spec ---

  it("converte texto normal em slug com hífens", () => {
    expect(slugify("Minha Empresa Legal")).toBe("minha-empresa-legal");
  });

  it("remove acentos: São José → sao-jose", () => {
    expect(slugify("São José")).toBe("sao-jose");
  });

  it("trim: remove espaços nas extremidades", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });

  it("colapsa espaços múltiplos em um único hífen", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("caracteres inválidos viram hífen e colapsam: A@B  C → a-b-c", () => {
    expect(slugify("A@B  C")).toBe("a-b-c");
  });

  // --- Casos extras para robustez ---

  it("colapsa múltiplos hífens consecutivos", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  it("remove hífens no início e no fim", () => {
    expect(slugify("-hello-")).toBe("hello");
  });

  it("trunca para no máximo 40 caracteres", () => {
    const long = "a".repeat(50);
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(40);
  });

  it("mantém string já válida intocada", () => {
    expect(slugify("already-valid-123")).toBe("already-valid-123");
  });

  it("retorna string vazia para input vazio", () => {
    expect(slugify("")).toBe("");
  });

  it("retorna string vazia para input apenas com caracteres inválidos", () => {
    expect(slugify("@@@!!!")).toBe("");
  });

  it("remove outros diacríticos: ção → cao", () => {
    expect(slugify("ação")).toBe("acao");
  });

  it("trata combinação de acentos + caracteres especiais", () => {
    expect(slugify("Açaí & Cia.")).toBe("acai-cia");
  });

  it("mantém dígitos no slug", () => {
    expect(slugify("Empresa 42")).toBe("empresa-42");
  });
});

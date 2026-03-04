/**
 * Unit tests — Zod schemas de Project
 */
import {
  projectCreateSchema,
  projectUpdateSchema,
  projectQuerySchema,
} from "@/schemas/project";

describe("projectCreateSchema", () => {
  it("aceita name válido", () => {
    const result = projectCreateSchema.safeParse({ name: "Meu Projeto" });
    expect(result.success).toBe(true);
  });

  it("aceita name + description", () => {
    const result = projectCreateSchema.safeParse({
      name: "Meu Projeto",
      description: "Descrição do projeto",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Descrição do projeto");
    }
  });

  it("rejeita name com menos de 2 caracteres", () => {
    const result = projectCreateSchema.safeParse({ name: "X" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("2 caracteres");
    }
  });

  it("rejeita name ausente", () => {
    const result = projectCreateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome é obrigatório");
    }
  });

  it("rejeita description acima de 500 caracteres", () => {
    const result = projectCreateSchema.safeParse({
      name: "Válido",
      description: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("projectUpdateSchema", () => {
  it("aceita somente name", () => {
    const result = projectUpdateSchema.safeParse({ name: "Novo Nome" });
    expect(result.success).toBe(true);
  });

  it("aceita description null (para limpar campo)", () => {
    const result = projectUpdateSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it("rejeita objeto vazio", () => {
    const result = projectUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nenhum campo para atualizar");
    }
  });
});

describe("projectQuerySchema", () => {
  it("aplica defaults: page=1, pageSize=10", () => {
    const result = projectQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it("aceita pageSize 20 e 50", () => {
    expect(projectQuerySchema.safeParse({ pageSize: 20 }).success).toBe(true);
    expect(projectQuerySchema.safeParse({ pageSize: 50 }).success).toBe(true);
  });

  it("rejeita pageSize inválido (ex: 15)", () => {
    const result = projectQuerySchema.safeParse({ pageSize: 15 });
    expect(result.success).toBe(false);
  });

  it("coerce string para number em page e pageSize", () => {
    const result = projectQuerySchema.safeParse({
      page: "2",
      pageSize: "20",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(20);
    }
  });
});

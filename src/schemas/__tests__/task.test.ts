/**
 * Unit tests — Zod schemas de Task
 */
import {
  taskCreateSchema,
  taskUpdateSchema,
  taskQuerySchema,
} from "@/schemas/task";

describe("taskCreateSchema", () => {
  it("aceita title válido com defaults", () => {
    const result = taskCreateSchema.safeParse({ title: "Minha Tarefa" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("TODO");
      expect(result.data.tags).toEqual([]);
    }
  });

  it("aceita todos os campos preenchidos", () => {
    const result = taskCreateSchema.safeParse({
      title: "Tarefa completa",
      description: "Descrição",
      status: "IN_PROGRESS",
      tags: ["backend", "api"],
    });
    expect(result.success).toBe(true);
  });

  it("rejeita title com menos de 2 caracteres", () => {
    const result = taskCreateSchema.safeParse({ title: "X" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("2 caracteres");
    }
  });

  it("rejeita title ausente", () => {
    const result = taskCreateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Título é obrigatório");
    }
  });

  it("rejeita status inválido", () => {
    const result = taskCreateSchema.safeParse({
      title: "Válido",
      status: "INVALID_STATUS",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita mais de 10 tags", () => {
    const result = taskCreateSchema.safeParse({
      title: "Válido",
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita tag com mais de 24 caracteres", () => {
    const result = taskCreateSchema.safeParse({
      title: "Válido",
      tags: ["x".repeat(25)],
    });
    expect(result.success).toBe(false);
  });
});

describe("taskUpdateSchema", () => {
  it("aceita somente status", () => {
    const result = taskUpdateSchema.safeParse({ status: "DONE" });
    expect(result.success).toBe(true);
  });

  it("aceita description null (para limpar campo)", () => {
    const result = taskUpdateSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it("rejeita objeto vazio", () => {
    const result = taskUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nenhum campo para atualizar");
    }
  });
});

describe("taskQuerySchema", () => {
  it("aplica defaults: page=1, pageSize=10", () => {
    const result = taskQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it("aceita filtro por status válido", () => {
    const result = taskQuerySchema.safeParse({ status: "IN_PROGRESS" });
    expect(result.success).toBe(true);
  });

  it("rejeita status inválido no filtro", () => {
    const result = taskQuerySchema.safeParse({ status: "BOGUS" });
    expect(result.success).toBe(false);
  });

  it("rejeita pageSize inválido", () => {
    const result = taskQuerySchema.safeParse({ pageSize: 30 });
    expect(result.success).toBe(false);
  });

  it("coerce strings para numbers", () => {
    const result = taskQuerySchema.safeParse({ page: "3", pageSize: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(50);
    }
  });
});

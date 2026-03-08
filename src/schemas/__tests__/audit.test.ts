import { auditQuerySchema } from "@/schemas/audit";

describe("auditQuerySchema", () => {
  it("aplica defaults: page=1, pageSize=10", () => {
    const result = auditQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it("aceita page e pageSize válidos", () => {
    const result = auditQuerySchema.parse({ page: "3", pageSize: "20" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(20);
  });

  it("rejeita page < 1", () => {
    const result = auditQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejeita pageSize inválido (não em [10,20,50])", () => {
    const result = auditQuerySchema.safeParse({ pageSize: "15" });
    expect(result.success).toBe(false);
  });

  it("aceita pageSize=50", () => {
    const result = auditQuerySchema.parse({ pageSize: "50" });
    expect(result.pageSize).toBe(50);
  });

  it("aceita from e to como ISO 8601 válidos", () => {
    const result = auditQuerySchema.parse({
      from: "2024-01-01T00:00:00.000Z",
      to: "2024-12-31T23:59:59.999Z",
    });
    expect(result.from).toBe("2024-01-01T00:00:00.000Z");
    expect(result.to).toBe("2024-12-31T23:59:59.999Z");
  });

  it("rejeita from como string não-ISO", () => {
    const result = auditQuerySchema.safeParse({ from: "2024-01-01" });
    expect(result.success).toBe(false);
  });

  it("rejeita to como string inválida", () => {
    const result = auditQuerySchema.safeParse({ to: "nao-e-data" });
    expect(result.success).toBe(false);
  });

  it("aceita action e search opcionais", () => {
    const result = auditQuerySchema.parse({
      action: "project.created",
      search: "projeto",
    });
    expect(result.action).toBe("project.created");
    expect(result.search).toBe("projeto");
  });

  it("rejeita action com mais de 100 caracteres", () => {
    const result = auditQuerySchema.safeParse({ action: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("aceita actorId opcional", () => {
    const result = auditQuerySchema.parse({ actorId: "user_abc123" });
    expect(result.actorId).toBe("user_abc123");
  });
});

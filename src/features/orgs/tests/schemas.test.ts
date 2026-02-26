import { createOrgSchema } from "../schemas";

describe("createOrgSchema", () => {
  it("accepts valid input", () => {
    const result = createOrgSchema.safeParse({
      name: "My Company",
      slug: "my-company",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("My Company");
      expect(result.data.slug).toBe("my-company");
    }
  });

  it("rejects empty name", () => {
    const result = createOrgSchema.safeParse({ name: "", slug: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = createOrgSchema.safeParse({ name: "A", slug: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects slug with uppercase letters", () => {
    const result = createOrgSchema.safeParse({
      name: "Test",
      slug: "My-Company",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with spaces", () => {
    const result = createOrgSchema.safeParse({
      name: "Test",
      slug: "my company",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with special characters", () => {
    const result = createOrgSchema.safeParse({
      name: "Test",
      slug: "my_company!",
    });
    expect(result.success).toBe(false);
  });

  it("accepts slug with hyphens and numbers", () => {
    const result = createOrgSchema.safeParse({
      name: "Test 123",
      slug: "test-123",
    });
    expect(result.success).toBe(true);
  });
});

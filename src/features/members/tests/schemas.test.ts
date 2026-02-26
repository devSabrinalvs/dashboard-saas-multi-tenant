import { inviteMemberSchema } from "../schemas";

describe("inviteMemberSchema", () => {
  it("accepts valid email and role", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
      role: "MEMBER",
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to MEMBER", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("MEMBER");
    }
  });

  it("rejects invalid email", () => {
    const result = inviteMemberSchema.safeParse({
      email: "not-an-email",
      role: "MEMBER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = inviteMemberSchema.safeParse({
      email: "user@example.com",
      role: "SUPERADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid roles", () => {
    const validRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];
    validRoles.forEach((role) => {
      const result = inviteMemberSchema.safeParse({
        email: "user@example.com",
        role,
      });
      expect(result.success).toBe(true);
    });
  });
});

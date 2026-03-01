import { can } from "@/security/rbac";

describe("RBAC — can()", () => {
  describe("OWNER", () => {
    it("pode billing:manage", () => {
      expect(can("OWNER", "billing:manage")).toBe(true);
    });

    it("pode member:invite", () => {
      expect(can("OWNER", "member:invite")).toBe(true);
    });

    it("pode project:create", () => {
      expect(can("OWNER", "project:create")).toBe(true);
    });

    it("pode audit:read", () => {
      expect(can("OWNER", "audit:read")).toBe(true);
    });
  });

  describe("ADMIN", () => {
    it("não pode billing:manage", () => {
      expect(can("ADMIN", "billing:manage")).toBe(false);
    });

    it("pode audit:read", () => {
      expect(can("ADMIN", "audit:read")).toBe(true);
    });

    it("pode member:invite", () => {
      expect(can("ADMIN", "member:invite")).toBe(true);
    });

    it("pode project:create", () => {
      expect(can("ADMIN", "project:create")).toBe(true);
    });
  });

  describe("MEMBER", () => {
    it("não pode member:invite", () => {
      expect(can("MEMBER", "member:invite")).toBe(false);
    });

    it("não pode audit:read", () => {
      expect(can("MEMBER", "audit:read")).toBe(false);
    });

    it("pode project:create", () => {
      expect(can("MEMBER", "project:create")).toBe(true);
    });

    it("pode task:create", () => {
      expect(can("MEMBER", "task:create")).toBe(true);
    });
  });

  describe("VIEWER", () => {
    it("não pode project:create", () => {
      expect(can("VIEWER", "project:create")).toBe(false);
    });

    it("não pode audit:read", () => {
      expect(can("VIEWER", "audit:read")).toBe(false);
    });

    it("não pode task:create", () => {
      expect(can("VIEWER", "task:create")).toBe(false);
    });
  });
});

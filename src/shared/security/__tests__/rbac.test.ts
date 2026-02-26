import { MemberRole } from "@prisma/client";
import {
  can,
  assertPermission,
  ForbiddenError,
  type OrgContext,
  type Permission,
} from "../rbac";

describe("RBAC - can()", () => {
  it("OWNER has all permissions", () => {
    const ownerPermissions: Permission[] = [
      "member:invite",
      "member:remove",
      "member:role:update",
      "project:create",
      "project:update",
      "project:delete",
      "project:read",
      "task:create",
      "task:update",
      "task:delete",
      "task:read",
      "audit:read",
      "org:update",
      "org:delete",
    ];

    ownerPermissions.forEach((permission) => {
      expect(can(MemberRole.OWNER, permission)).toBe(true);
    });
  });

  it("ADMIN can invite members", () => {
    expect(can(MemberRole.ADMIN, "member:invite")).toBe(true);
  });

  it("ADMIN cannot delete org", () => {
    expect(can(MemberRole.ADMIN, "org:delete")).toBe(false);
  });

  it("MEMBER can create projects and tasks", () => {
    expect(can(MemberRole.MEMBER, "project:create")).toBe(true);
    expect(can(MemberRole.MEMBER, "task:create")).toBe(true);
  });

  it("MEMBER cannot invite members", () => {
    expect(can(MemberRole.MEMBER, "member:invite")).toBe(false);
  });

  it("MEMBER cannot delete projects", () => {
    expect(can(MemberRole.MEMBER, "project:delete")).toBe(false);
  });

  it("VIEWER can only read projects and tasks", () => {
    expect(can(MemberRole.VIEWER, "project:read")).toBe(true);
    expect(can(MemberRole.VIEWER, "task:read")).toBe(true);
    expect(can(MemberRole.VIEWER, "project:create")).toBe(false);
    expect(can(MemberRole.VIEWER, "task:create")).toBe(false);
    expect(can(MemberRole.VIEWER, "member:invite")).toBe(false);
    expect(can(MemberRole.VIEWER, "audit:read")).toBe(false);
  });
});

describe("RBAC - assertPermission()", () => {
  const ownerContext: OrgContext = {
    userId: "user-1",
    orgId: "org-1",
    role: MemberRole.OWNER,
  };

  const viewerContext: OrgContext = {
    userId: "user-2",
    orgId: "org-1",
    role: MemberRole.VIEWER,
  };

  it("does not throw for allowed permission", () => {
    expect(() =>
      assertPermission(ownerContext, "project:delete")
    ).not.toThrow();
  });

  it("throws ForbiddenError for disallowed permission", () => {
    expect(() =>
      assertPermission(viewerContext, "project:create")
    ).toThrow(ForbiddenError);
  });

  it("ForbiddenError has statusCode 403", () => {
    try {
      assertPermission(viewerContext, "member:invite");
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as ForbiddenError).statusCode).toBe(403);
    }
  });
});

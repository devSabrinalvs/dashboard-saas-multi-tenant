/**
 * Integration tests for server-side security:
 * - Cross-tenant access blocked
 * - Role restrictions enforced
 *
 * These tests mock Prisma and auth to test the resolveOrgContext + assertPermission logic.
 */
import { MemberRole } from "@prisma/client";

// Mock Prisma
const mockFindUnique = jest.fn();
const mockMembershipFindUnique = jest.fn();

jest.mock("@/shared/db", () => ({
  prisma: {
    organization: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
    membership: { findUnique: (...args: unknown[]) => mockMembershipFindUnique(...args) },
  },
}));

// Mock auth
const mockAuth = jest.fn();
jest.mock("@/shared/auth", () => ({
  auth: () => mockAuth(),
}));

import { resolveOrgContext, UnauthorizedError, NotMemberError, OrgNotFoundError } from "../org-context";
import { assertPermission, ForbiddenError } from "../rbac";

describe("Cross-tenant security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks unauthenticated access", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(resolveOrgContext("test-org")).rejects.toThrow(
      UnauthorizedError
    );
  });

  it("returns 404 for non-existent org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue(null);

    await expect(resolveOrgContext("nonexistent")).rejects.toThrow(
      OrgNotFoundError
    );
  });

  it("blocks access to org where user is not a member", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue({ id: "org-other" });
    mockMembershipFindUnique.mockResolvedValue(null);

    await expect(resolveOrgContext("other-org")).rejects.toThrow(
      NotMemberError
    );
  });

  it("returns valid context for org member", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue({ id: "org-1" });
    mockMembershipFindUnique.mockResolvedValue({
      role: MemberRole.MEMBER,
    });

    const context = await resolveOrgContext("my-org");
    expect(context).toEqual({
      userId: "user-1",
      orgId: "org-1",
      role: MemberRole.MEMBER,
    });
  });

  it("MEMBER cannot access admin-only actions", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFindUnique.mockResolvedValue({ id: "org-1" });
    mockMembershipFindUnique.mockResolvedValue({
      role: MemberRole.MEMBER,
    });

    const context = await resolveOrgContext("my-org");
    expect(() => assertPermission(context, "member:invite")).toThrow(
      ForbiddenError
    );
  });

  it("VIEWER cannot create projects", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2" } });
    mockFindUnique.mockResolvedValue({ id: "org-1" });
    mockMembershipFindUnique.mockResolvedValue({
      role: MemberRole.VIEWER,
    });

    const context = await resolveOrgContext("my-org");
    expect(() => assertPermission(context, "project:create")).toThrow(
      ForbiddenError
    );
    expect(() => assertPermission(context, "task:create")).toThrow(
      ForbiddenError
    );
  });

  it("ADMIN can invite but cannot delete org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-3" } });
    mockFindUnique.mockResolvedValue({ id: "org-1" });
    mockMembershipFindUnique.mockResolvedValue({
      role: MemberRole.ADMIN,
    });

    const context = await resolveOrgContext("my-org");
    expect(() => assertPermission(context, "member:invite")).not.toThrow();
    expect(() => assertPermission(context, "org:delete")).toThrow(
      ForbiddenError
    );
  });
});

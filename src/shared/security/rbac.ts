import { MemberRole } from "@prisma/client";

export type Permission =
  | "member:invite"
  | "member:remove"
  | "member:role:update"
  | "project:create"
  | "project:update"
  | "project:delete"
  | "project:read"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "task:read"
  | "audit:read"
  | "org:update"
  | "org:delete";

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  OWNER: [
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
  ],
  ADMIN: [
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
  ],
  MEMBER: [
    "project:read",
    "project:create",
    "task:create",
    "task:update",
    "task:read",
  ],
  VIEWER: ["project:read", "task:read"],
};

export function can(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissionsForRole(role: MemberRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export interface OrgContext {
  userId: string;
  orgId: string;
  role: MemberRole;
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertPermission(
  context: OrgContext,
  permission: Permission
): void {
  if (!can(context.role, permission)) {
    throw new ForbiddenError(
      `Role ${context.role} does not have permission: ${permission}`
    );
  }
}

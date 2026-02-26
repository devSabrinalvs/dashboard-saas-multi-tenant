import { prisma } from "@/shared/db";
import { auth } from "@/shared/auth";
import { OrgContext } from "./rbac";

export class UnauthorizedError extends Error {
  public readonly statusCode = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class OrgNotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(message = "Organization not found") {
    super(message);
    this.name = "OrgNotFoundError";
  }
}

export class NotMemberError extends Error {
  public readonly statusCode = 403;
  constructor(message = "Not a member of this organization") {
    super(message);
    this.name = "NotMemberError";
  }
}

/**
 * Resolves org context from slug — NEVER trust orgId from client.
 * 1. Validates session
 * 2. Resolves slug -> orgId
 * 3. Verifies user membership
 * 4. Returns typed context
 */
export async function resolveOrgContext(
  orgSlug: string
): Promise<OrgContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });

  if (!org) {
    throw new OrgNotFoundError();
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId: org.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new NotMemberError();
  }

  return {
    userId: session.user.id,
    orgId: org.id,
    role: membership.role,
  };
}

/**
 * Get authenticated user id from session. Throws if not authenticated.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user.id;
}

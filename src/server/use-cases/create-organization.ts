import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { findOrgBySlug } from "@/server/repo/organization-repo";

/**
 * Lançado quando o slug escolhido já está em uso por outra organização.
 */
export class SlugConflictError extends Error {
  readonly status = 409;

  constructor() {
    super("Esse slug já está em uso.");
    this.name = "SlugConflictError";
    Object.setPrototypeOf(this, SlugConflictError.prototype);
  }
}

interface CreateOrgInput {
  name: string;
  slug: string;
  userId: string;
}

/**
 * Cria uma organização e vincula o criador como OWNER em uma única transação.
 *
 * @throws SlugConflictError se o slug já existir.
 */
export async function createOrganization({
  name,
  slug,
  userId,
}: CreateOrgInput): Promise<{ orgSlug: string }> {
  const existing = await findOrgBySlug(slug);
  if (existing) throw new SlugConflictError();

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name, slug } });
    await tx.membership.create({
      data: { userId, orgId: org.id, role: Role.OWNER },
    });
  });

  return { orgSlug: slug };
}

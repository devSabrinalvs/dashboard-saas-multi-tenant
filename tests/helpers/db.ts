/**
 * Utilitários compartilhados pelos testes de integração.
 *
 * Cria um cliente Prisma dedicado ao banco de testes, além de helpers
 * para resetar dados e criar fixtures comuns.
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Role } from "@/generated/prisma/enums";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Cliente Prisma de testes
// ---------------------------------------------------------------------------

function makeTestPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está definido. Verifique .env.test.");
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const testPrisma = makeTestPrisma();

// ---------------------------------------------------------------------------
// Reset de dados
// ---------------------------------------------------------------------------

/**
 * Remove todos os dados das tabelas na ordem correta (FK-safe).
 * Deve ser chamado em `beforeEach` para isolar testes.
 */
export async function resetDb(): Promise<void> {
  // Tabelas dependentes primeiro
  await testPrisma.$executeRaw`DELETE FROM "AuditLog"`;
  await testPrisma.$executeRaw`DELETE FROM "Task"`;
  await testPrisma.$executeRaw`DELETE FROM "Project"`;
  await testPrisma.$executeRaw`DELETE FROM "Invite"`;
  await testPrisma.$executeRaw`DELETE FROM "Membership"`;
  await testPrisma.$executeRaw`DELETE FROM "Organization"`;
  // Auth.js tables
  await testPrisma.$executeRaw`DELETE FROM "Session"`;
  await testPrisma.$executeRaw`DELETE FROM "Account"`;
  await testPrisma.$executeRaw`DELETE FROM "VerificationToken"`;
  // Por último: User (referenciado pelas demais)
  await testPrisma.$executeRaw`DELETE FROM "User"`;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export interface TestUser {
  id: string;
  email: string;
}

/**
 * Cria um usuário no banco de testes.
 * Usa fator de custo 1 no bcrypt para velocidade em testes.
 */
export async function createTestUser(email = "test@example.com"): Promise<TestUser> {
  const password = await bcrypt.hash("password123", 1);
  const user = await testPrisma.user.create({
    data: { email, password, name: "Test User" },
  });
  return { id: user.id, email: user.email };
}

export interface TestOrg {
  id: string;
  slug: string;
  name: string;
}

/**
 * Cria uma organização e um Membership para o usuário informado.
 */
export async function createOrgWithMembership(
  userId: string,
  orgSlug: string,
  role: Role = Role.OWNER,
): Promise<TestOrg> {
  const org = await testPrisma.organization.create({
    data: { name: `Org ${orgSlug}`, slug: orgSlug },
  });
  await testPrisma.membership.create({
    data: { userId, orgId: org.id, role },
  });
  return { id: org.id, slug: org.slug, name: org.name };
}

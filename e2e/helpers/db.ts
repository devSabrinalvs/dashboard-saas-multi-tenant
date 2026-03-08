/**
 * Helper de banco de dados para testes E2E.
 * Usa DATABASE_URL_TEST para criar/limpar dados de teste sem afetar o dev DB.
 *
 * Usado pelo global-setup.ts do Playwright.
 */
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Role } from "../../src/generated/prisma/enums";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as path from "path";

// Carrega .env.test para pegar DATABASE_URL_TEST
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não encontrado em .env.test");
}

function makeE2EPrisma(): PrismaClient {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const e2ePrisma = makeE2EPrisma();

// ─── Dados de teste E2E ──────────────────────────────────────────────────────

export const E2E_OWNER = {
  email: "owner@e2e.test",
  password: "password123",
  name: "E2E Owner",
};

export const E2E_VIEWER = {
  email: "viewer@e2e.test",
  password: "password123",
  name: "E2E Viewer",
};

export const E2E_ORG = {
  name: "E2E Org",
  slug: "e2e-org",
};

export const E2E_ORG_B = {
  name: "E2E Org B",
  slug: "e2e-org-b",
};

// ─── Seed ────────────────────────────────────────────────────────────────────

/**
 * Limpa e recria todos os dados de teste E2E.
 * Chamado pelo global-setup.ts antes dos testes.
 */
export async function seedE2EData() {
  // Limpeza em ordem FK-safe
  await e2ePrisma.$executeRaw`DELETE FROM "RateLimitBucket"`;
  await e2ePrisma.$executeRaw`DELETE FROM "AuditLog"`;
  await e2ePrisma.$executeRaw`DELETE FROM "Task"`;
  await e2ePrisma.$executeRaw`DELETE FROM "Project"`;
  await e2ePrisma.$executeRaw`DELETE FROM "Invite"`;
  await e2ePrisma.$executeRaw`DELETE FROM "Membership"`;
  await e2ePrisma.$executeRaw`DELETE FROM "Organization"`;
  await e2ePrisma.$executeRaw`DELETE FROM "Session"`;
  await e2ePrisma.$executeRaw`DELETE FROM "Account"`;
  await e2ePrisma.$executeRaw`DELETE FROM "VerificationToken"`;
  await e2ePrisma.$executeRaw`DELETE FROM "User"`;

  const passwordHash = await bcrypt.hash("password123", 1); // custo 1 para velocidade

  // Owner
  const owner = await e2ePrisma.user.create({
    data: { email: E2E_OWNER.email, password: passwordHash, name: E2E_OWNER.name },
  });

  // Viewer
  const viewer = await e2ePrisma.user.create({
    data: { email: E2E_VIEWER.email, password: passwordHash, name: E2E_VIEWER.name },
  });

  // Org principal (owner é OWNER, viewer é VIEWER)
  const org = await e2ePrisma.organization.create({
    data: { name: E2E_ORG.name, slug: E2E_ORG.slug },
  });

  await e2ePrisma.membership.createMany({
    data: [
      { userId: owner.id, orgId: org.id, role: Role.OWNER },
      { userId: viewer.id, orgId: org.id, role: Role.VIEWER },
    ],
  });

  // Org B — separada, só o owner (para teste de isolamento)
  const orgB = await e2ePrisma.organization.create({
    data: { name: E2E_ORG_B.name, slug: E2E_ORG_B.slug },
  });

  await e2ePrisma.membership.create({
    data: { userId: owner.id, orgId: orgB.id, role: Role.OWNER },
  });

  // Projeto seed para testes de isolamento e projects page
  await e2ePrisma.project.create({
    data: { orgId: org.id, name: "Projeto Seed E2E", description: "Criado pelo seed" },
  });

  console.log("✔ Dados E2E criados com sucesso");
  return { owner, viewer, org, orgB };
}

/**
 * Playwright Global Setup — executado UMA VEZ antes de todos os testes E2E.
 *
 * Responsabilidades:
 * 1. Semear o banco de teste (DATABASE_URL do .env.test) com usuários e orgs
 * 2. Garantir que as migrations foram aplicadas
 *
 * IMPORTANTE: O app deve estar rodando com o banco de TESTE.
 * Na prática, inicie com: DATABASE_URL=$(cat .env.test | grep DATABASE_URL | cut -d= -f2-) pnpm dev
 */
import { seedE2EData, e2ePrisma } from "./helpers/db";

export default async function globalSetup() {
  console.log("\n[Playwright] Iniciando global setup...");

  await seedE2EData();
  await e2ePrisma.$disconnect();

  console.log("[Playwright] Global setup concluído.\n");
}

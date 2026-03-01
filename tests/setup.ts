/**
 * Executado pelo Jest antes de cada arquivo de teste (setupFiles).
 * Sobrescreve DATABASE_URL com o banco de testes para que qualquer
 * módulo que leia process.env.DATABASE_URL (ex: src/lib/prisma.ts)
 * aponte para o DB de testes e não para o dev.
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

// Garante que o singleton do Prisma (globalForPrisma) seja recriado
// com a nova DATABASE_URL neste worker Jest.
delete (globalThis as Record<string, unknown>).prisma;

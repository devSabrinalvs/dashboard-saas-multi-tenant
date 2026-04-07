/**
 * Mock do cliente Prisma para testes unitários (CJS/ts-jest).
 * Substitui @/lib/prisma para evitar o erro "import.meta" em modo CJS.
 * Os testes de integração usam o testPrisma real (jest.config.int.js / ESM).
 */
export const prisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

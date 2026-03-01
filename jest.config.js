/**
 * Jest config para testes UNITÁRIOS (sem banco de dados, CJS).
 *
 * Exclui arquivos *.int.test.ts — esses são cobertos por jest.config.int.js
 * que roda com --experimental-vm-modules (ESM) para suportar Prisma 7.
 *
 * Como rodar: pnpm test:unit  ou  pnpm test
 */
/** @type {import("jest").Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  // Exclui testes de integração (precisam de DB + ESM)
  testPathIgnorePatterns: ["\\.int\\.test\\.ts$"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@tests/(.*)$": "<rootDir>/tests/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.jest.json",
      },
    ],
  },
  // Carrega .env.test e sobrescreve DATABASE_URL antes de cada arquivo de teste
  setupFiles: ["<rootDir>/tests/setup.ts"],
};

module.exports = config;

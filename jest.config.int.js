/**
 * Jest config para testes de INTEGRAÇÃO (com banco de dados real).
 *
 * Usa --experimental-vm-modules + ts-jest ESM porque o Prisma 7
 * carrega um módulo WASM (.mjs) que é ESM-only.
 *
 * Como rodar:
 *   pnpm test:int
 * (O script usa `node --experimental-vm-modules` internamente.)
 */
/** @type {import("jest").Config} */
const config = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.int.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@tests/(.*)$": "<rootDir>/tests/$1",
  },
  transform: {
    // Transforma .ts/.tsx/.js/.jsx — necessário para que esModuleInterop
    // seja aplicado a pacotes CJS com __esModule:true (ex: next-auth)
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.jest.int.json",
        useESM: true,
      },
    ],
  },
  // Permite que ts-jest transforme pacotes que precisam de compilação no modo ESM:
  //   @prisma/*  — distribui TypeScript source (Prisma 7 com prisma-client generator)
  //   next-auth  — CJS default exports que precisam de esModuleInterop
  //   @auth/*    — idem (ex: @auth/prisma-adapter)
  transformIgnorePatterns: ["node_modules/(?!(@prisma/|next-auth|@auth/))"],
  // Testes de integração compartilham o mesmo banco Postgres.
  // --runInBand executa sequencialmente para evitar race conditions nos resets de DB.
  maxWorkers: 1,
  setupFiles: ["<rootDir>/tests/setup.ts"],
};

module.exports = config;

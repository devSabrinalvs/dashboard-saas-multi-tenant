/**
 * Jest config para testes de UI (RTL, jsdom).
 *
 * Usa mocks de módulo (hooks, fetch) em vez de MSW para evitar
 * problemas de compatibilidade ESM/CJS — MSW v2 é ESM-first.
 *
 * Como rodar: pnpm test:ui
 */
/** @type {import("jest").Config} */
const config = {
  displayName: "ui",
  preset: "ts-jest",
  // Ambiente custom: jsdom + polyfills de Fetch API (Node 22) e TextEncoder
  testEnvironment: "<rootDir>/tests/jest-env-with-fetch.js",
  testMatch: ["**/__tests__/**/*.ui.test.{ts,tsx}"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@tests/(.*)$": "<rootDir>/tests/$1",
  },
  transform: {
    "^.+\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.jest.ui.json",
      },
    ],
  },
  // setup.ts carrega .env.test; ui-setup.ts estende expect com jest-dom
  setupFiles: ["<rootDir>/tests/setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/ui-setup.ts"],
};

module.exports = config;

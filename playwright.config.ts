import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

const OWNER_AUTH = path.join(__dirname, "e2e/.auth/owner.json");
const VIEWER_AUTH = path.join(__dirname, "e2e/.auth/viewer.json");

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false, // Evita race conditions com banco compartilhado
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Timeout de ação (click, fill, etc.)
    actionTimeout: 10_000,
    // Timeout de navegação
    navigationTimeout: 15_000,
  },

  projects: [
    // ── Fase 1: Login e geração de storageState ──────────────────────────
    {
      name: "setup",
      testMatch: /fixtures\/auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // ── Fase 2: Specs com OWNER autenticado ──────────────────────────────
    {
      name: "chromium-owner",
      use: {
        ...devices["Desktop Chrome"],
        storageState: OWNER_AUTH,
      },
      dependencies: ["setup"],
    },

    // ── Fase 3: Specs com VIEWER autenticado ─────────────────────────────
    {
      name: "chromium-viewer",
      testMatch: /specs\/team\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: VIEWER_AUTH,
      },
      dependencies: ["setup"],
    },
  ],

  // Dev: reutiliza servidor já rodando; CI: inicia o servidor
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

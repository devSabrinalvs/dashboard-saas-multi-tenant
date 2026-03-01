/**
 * Wrapper que executa os testes de integração com --experimental-vm-modules.
 *
 * Necessário porque Prisma 7 carrega um WASM (.mjs) que é ESM-only.
 * --experimental-vm-modules permite que o Jest rode módulos ESM nativamente.
 *
 * Uso: node tests/scripts/run-int-tests.js [jest-flags...]
 */
const { spawnSync } = require("child_process");

// Injeta --experimental-vm-modules para o processo filho (jest)
const env = {
  ...process.env,
  NODE_OPTIONS:
    (process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS + " " : "") +
    "--experimental-vm-modules",
};

const result = spawnSync(
  "pnpm",
  ["exec", "jest", "--config", "jest.config.int.js", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env,
    // shell: true necessário no Windows para resolver executáveis .cmd
    shell: process.platform === "win32",
  }
);

process.exit(result.status ?? 1);

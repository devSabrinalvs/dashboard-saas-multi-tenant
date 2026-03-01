/**
 * Aplica as migrations do Prisma no banco de testes.
 * Lê DATABASE_URL do arquivo .env.test e chama "prisma migrate deploy".
 *
 * Uso: node tests/scripts/migrate-test-db.js
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: ".env.test", override: true });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require("child_process");

console.log("Aplicando migrations no banco de testes:", process.env.DATABASE_URL);

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: process.env,
});

console.log("Migrations aplicadas com sucesso.");

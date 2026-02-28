/**
 * Seed: cria o usuário de teste definido nas variáveis de ambiente.
 * Executar com: pnpm db:seed
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Defina SEED_USER_EMAIL e SEED_USER_PASSWORD no .env antes de rodar o seed."
    );
  }

  if (password.length < 6) {
    throw new Error("SEED_USER_PASSWORD deve ter pelo menos 6 caracteres.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword },
    create: {
      email,
      name: "Usuário de Teste",
      password: hashedPassword,
    },
  });

  console.log(`✓ Usuário pronto: ${user.email} (id: ${user.id})`);
}

main()
  .catch((error) => {
    console.error("Erro no seed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

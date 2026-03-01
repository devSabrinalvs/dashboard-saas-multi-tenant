/**
 * Seed: popula o banco com dados mínimos para desenvolvimento.
 * Executar com: pnpm db:seed
 *
 * Cria (idempotente):
 *  - 3 usuários de teste:
 *      - SEED_USER_EMAIL / SEED_USER_PASSWORD  → OWNER em org-default e acme
 *      - member@example.com / membro123        → MEMBER em acme
 *      - viewer@example.com / viewer123        → VIEWER em acme
 *  - 2 organizações: "org-default" e "acme"
 *  - 1 projeto de exemplo + 2 tasks (em org-default)
 *
 * Credenciais de teste (acme):
 *  | Email                 | Senha       | Role   |
 *  |-----------------------|-------------|--------|
 *  | SEED_USER_EMAIL (.env)| (do .env)   | OWNER  |
 *  | member@example.com    | membro123   | MEMBER |
 *  | viewer@example.com    | viewer123   | VIEWER |
 */
import "dotenv/config";
import {
  PrismaClient,
  Role,
  TaskStatus,
} from "../src/generated/prisma/client";
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

  // ── 1. Usuário ──────────────────────────────────────────────────────────────
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
  console.log(`✓ Usuário:       ${user.email} (id: ${user.id})`);

  // ── 2. Organização ──────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "org-default" },
    update: {},
    create: {
      name: "Organização de Teste",
      slug: "org-default",
    },
  });
  console.log(`✓ Organização:   ${org.name} (slug: ${org.slug})`);

  // ── 3. Membership OWNER ─────────────────────────────────────────────────────
  const membership = await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: { role: Role.OWNER },
    create: {
      userId: user.id,
      orgId: org.id,
      role: Role.OWNER,
    },
  });
  console.log(`✓ Membership:    ${membership.role} em ${org.slug}`);

  // ── 3b. Segunda organização para testar o Org Switcher ─────────────────────
  const acme = await prisma.organization.upsert({
    where: { slug: "acme" },
    update: {},
    create: { name: "Acme Corp", slug: "acme" },
  });
  console.log(`✓ Organização:   ${acme.name} (slug: ${acme.slug})`);

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: acme.id } },
    update: { role: Role.OWNER },
    create: { userId: user.id, orgId: acme.id, role: Role.OWNER },
  });
  console.log(`✓ Membership:    OWNER em ${acme.slug}`);

  // ── 3c. Usuário MEMBER em acme ──────────────────────────────────────────────
  const memberUser = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: { password: await bcrypt.hash("membro123", 12) },
    create: {
      email: "member@example.com",
      name: "Usuário Membro",
      password: await bcrypt.hash("membro123", 12),
    },
  });
  console.log(`✓ Usuário:       ${memberUser.email} (id: ${memberUser.id})`);

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: memberUser.id, orgId: acme.id } },
    update: { role: Role.MEMBER },
    create: { userId: memberUser.id, orgId: acme.id, role: Role.MEMBER },
  });
  console.log(`✓ Membership:    MEMBER em ${acme.slug}`);

  // ── 3d. Usuário VIEWER em acme ──────────────────────────────────────────────
  const viewerUser = await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: { password: await bcrypt.hash("viewer123", 12) },
    create: {
      email: "viewer@example.com",
      name: "Usuário Viewer",
      password: await bcrypt.hash("viewer123", 12),
    },
  });
  console.log(`✓ Usuário:       ${viewerUser.email} (id: ${viewerUser.id})`);

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: viewerUser.id, orgId: acme.id } },
    update: { role: Role.VIEWER },
    create: { userId: viewerUser.id, orgId: acme.id, role: Role.VIEWER },
  });
  console.log(`✓ Membership:    VIEWER em ${acme.slug}`);

  // ── 4. Projeto ──────────────────────────────────────────────────────────────
  let project = await prisma.project.findFirst({
    where: { orgId: org.id, name: "Projeto de Exemplo" },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        orgId: org.id,
        name: "Projeto de Exemplo",
        description: "Projeto criado pelo seed para testes e validação.",
      },
    });
  }
  console.log(`✓ Projeto:       ${project.name} (id: ${project.id})`);

  // ── 5. Tasks ────────────────────────────────────────────────────────────────
  const existingTaskCount = await prisma.task.count({
    where: { projectId: project.id },
  });

  if (existingTaskCount === 0) {
    await prisma.task.createMany({
      data: [
        {
          orgId: org.id,
          projectId: project.id,
          title: "Configurar ambiente de desenvolvimento",
          description: "Instalar dependências, Docker e configurar .env",
          status: TaskStatus.DONE,
          tags: ["setup", "infra"],
        },
        {
          orgId: org.id,
          projectId: project.id,
          title: "Implementar autenticação",
          description: "Login com email/senha usando next-auth e bcrypt",
          status: TaskStatus.IN_PROGRESS,
          tags: ["auth", "backend"],
        },
      ],
    });
  }

  const taskCount = await prisma.task.count({ where: { projectId: project.id } });
  console.log(`✓ Tasks:         ${taskCount} tarefa(s) no projeto`);

  console.log("\n✅ Seed concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error("Erro no seed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

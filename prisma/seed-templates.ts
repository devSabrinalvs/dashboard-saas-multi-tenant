/**
 * Seed: cria os templates de sistema disponíveis para todas as organizações.
 * Execute com: pnpm exec tsx prisma/seed-templates.ts
 */
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const SYSTEM_TEMPLATES = [
  {
    name: "Sprint Ágil",
    description: "Template básico para uma sprint com planejamento, execução e revisão.",
    tasks: [
      { title: "Planning: definir escopo da sprint", status: "TODO", priority: "HIGH", tags: ["planning"] },
      { title: "Criar backlog da sprint", status: "TODO", priority: "MEDIUM", tags: ["planning"] },
      { title: "Daily standup (repetir diariamente)", status: "TODO", priority: "LOW", tags: [] },
      { title: "Implementar feature principal", status: "TODO", priority: "HIGH", tags: ["dev"] },
      { title: "Code review", status: "TODO", priority: "MEDIUM", tags: ["dev"] },
      { title: "Testes e QA", status: "TODO", priority: "HIGH", tags: ["qa"] },
      { title: "Sprint review com stakeholders", status: "TODO", priority: "MEDIUM", tags: ["review"] },
      { title: "Retrospectiva da sprint", status: "TODO", priority: "LOW", tags: ["review"] },
    ],
  },
  {
    name: "Lançamento de Produto",
    description: "Checklist completo para lançar um produto ou funcionalidade.",
    tasks: [
      { title: "Definir requisitos e escopo", status: "TODO", priority: "URGENT", tags: ["planejamento"] },
      { title: "Design e prototipagem", status: "TODO", priority: "HIGH", tags: ["design"] },
      { title: "Desenvolvimento backend", status: "TODO", priority: "HIGH", tags: ["dev"] },
      { title: "Desenvolvimento frontend", status: "TODO", priority: "HIGH", tags: ["dev"] },
      { title: "Testes de integração", status: "TODO", priority: "HIGH", tags: ["qa"] },
      { title: "Testes de usabilidade", status: "TODO", priority: "MEDIUM", tags: ["qa"] },
      { title: "Preparar documentação", status: "TODO", priority: "MEDIUM", tags: ["docs"] },
      { title: "Configurar ambiente de produção", status: "TODO", priority: "HIGH", tags: ["infra"] },
      { title: "Deploy em produção", status: "TODO", priority: "URGENT", tags: ["infra"] },
      { title: "Monitoramento pós-lançamento", status: "TODO", priority: "HIGH", tags: ["infra"] },
    ],
  },
  {
    name: "Onboarding de Cliente",
    description: "Processo de integração de um novo cliente.",
    tasks: [
      { title: "Reunião de kickoff", status: "TODO", priority: "HIGH", tags: ["cliente"] },
      { title: "Configurar conta e acessos", status: "TODO", priority: "HIGH", tags: ["setup"] },
      { title: "Migração de dados", status: "TODO", priority: "MEDIUM", tags: ["setup"] },
      { title: "Treinamento da equipe do cliente", status: "TODO", priority: "MEDIUM", tags: ["cliente"] },
      { title: "Integração com sistemas existentes", status: "TODO", priority: "MEDIUM", tags: ["tech"] },
      { title: "Teste de aceitação do usuário (UAT)", status: "TODO", priority: "HIGH", tags: ["qa"] },
      { title: "Go-live", status: "TODO", priority: "URGENT", tags: ["cliente"] },
      { title: "Suporte pós-implementação (30 dias)", status: "TODO", priority: "MEDIUM", tags: ["cliente"] },
    ],
  },
];

async function main() {
  console.log("Seeding system templates…");

  for (const tpl of SYSTEM_TEMPLATES) {
    await prisma.projectTemplate.upsert({
      where: { id: `system-${tpl.name.toLowerCase().replace(/\s+/g, "-")}` },
      create: {
        id: `system-${tpl.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: tpl.name,
        description: tpl.description,
        tasksJson: tpl.tasks,
        isSystem: true,
      },
      update: {
        name: tpl.name,
        description: tpl.description,
        tasksJson: tpl.tasks,
      },
    });
    console.log(`  ✓ ${tpl.name}`);
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => void prisma.$disconnect());

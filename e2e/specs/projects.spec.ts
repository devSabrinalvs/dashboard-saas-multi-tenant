/**
 * E2E — Projects CRUD e filtros de tasks
 *
 * Fluxo 1: Criar projeto → verificar que aparece na lista
 * Fluxo 2: Criar task → filtrar por status
 *
 * Usa storageState do OWNER (chromium-owner).
 * Depende do seed do global-setup.
 */
import { test, expect } from "@playwright/test";

const ORG_SLUG = "e2e-org";
const PROJECTS_URL = `/org/${ORG_SLUG}/projects`;

test.describe("Projects — CRUD", () => {
  test("lista de projetos é exibida corretamente", async ({ page }) => {
    await page.goto(PROJECTS_URL);

    // Deve aparecer a tabela de projetos (seed criou "Projeto Seed E2E")
    await expect(page.getByText("Projeto Seed E2E")).toBeVisible({ timeout: 10_000 });
  });

  test("botão 'Novo Projeto' visível para OWNER", async ({ page }) => {
    await page.goto(PROJECTS_URL);

    const newBtn = page.getByTestId("new-project-btn");
    await expect(newBtn).toBeVisible({ timeout: 8_000 });
  });

  test("cria novo projeto via modal e aparece na lista", async ({ page }) => {
    await page.goto(PROJECTS_URL);

    // Abre modal
    await page.getByTestId("new-project-btn").click();

    // Preenche nome do projeto
    const projectName = `Projeto E2E ${Date.now()}`;
    await page.getByLabel(/nome/i).fill(projectName);
    await page.getByRole("button", { name: /criar|salvar/i }).click();

    // Projeto deve aparecer na lista após criação
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 });
  });

  test("pesquisa por nome filtra a lista", async ({ page }) => {
    await page.goto(PROJECTS_URL);

    // Aguarda a tabela carregar
    await expect(page.getByText("Projeto Seed E2E")).toBeVisible({ timeout: 10_000 });

    // Busca por nome que não existe
    await page.getByPlaceholder("Buscar projetos…").fill("xyznotfound");

    // Deve mostrar empty state
    await expect(page.getByText("Nenhum projeto encontrado")).toBeVisible({ timeout: 5_000 });

    // Limpa busca
    await page.getByPlaceholder("Buscar projetos…").fill("");
    await expect(page.getByText("Projeto Seed E2E")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Tasks — criação e filtro por status", () => {
  test("cria task e filtra por status", async ({ page }) => {
    await page.goto(PROJECTS_URL);

    // Acessa o projeto seed
    await page.getByText("Projeto Seed E2E").click();
    await page.waitForURL(/\/projects\/.+/, { timeout: 10_000 });

    // Cria nova task
    const taskTitle = `Task E2E ${Date.now()}`;
    const newTaskBtn = page.getByRole("button", { name: /nova tarefa|new task/i });
    await expect(newTaskBtn).toBeVisible({ timeout: 8_000 });
    await newTaskBtn.click();

    await page.getByLabel(/título/i).fill(taskTitle);
    await page.getByRole("button", { name: /criar|salvar/i }).click();

    // Task deve aparecer na lista
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10_000 });

    // Filtra por status "TODO" (A fazer)
    const statusFilter = page.getByRole("combobox").or(page.getByLabel(/status/i));
    if (await statusFilter.count() > 0) {
      await statusFilter.first().selectOption({ label: "A fazer" });
      await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5_000 });
    }
  });
});

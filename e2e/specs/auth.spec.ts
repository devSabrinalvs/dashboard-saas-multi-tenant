/**
 * E2E — Autenticação e seleção de organização
 *
 * Fluxo: login → /org/select → /org/e2e-org/dashboard
 *
 * Depende de:
 *  - App rodando com DATABASE_URL do .env.test
 *  - Dados semeados pelo global-setup (owner@e2e.test)
 */
import { test, expect } from "@playwright/test";
import { E2E_OWNER, E2E_VIEWER } from "../helpers/db";

// Estes testes NÃO usam storageState — testam o fluxo de login diretamente
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Autenticação", () => {
  test("login com credenciais válidas → redireciona para dashboard da org", async ({ page }) => {
    await page.goto("/login");

    // Preenche formulário
    await page.locator("#email").fill(E2E_OWNER.email);
    await page.locator("#password").fill(E2E_OWNER.password);
    await page.locator('button[type="submit"]').click();

    // Aguarda redirecionamento (select ou dashboard)
    await page.waitForURL(/\/(org\/select|org\/.+\/dashboard)/, { timeout: 15_000 });

    // Se caiu no select, navega para a org
    if (page.url().includes("/org/select")) {
      await page.getByText("E2E Org").first().click();
      await page.waitForURL("**/org/e2e-org/dashboard");
    }

    // Deve estar no dashboard da org
    await expect(page).toHaveURL(/\/org\/e2e-org\/dashboard/);
  });

  test("credenciais inválidas → exibe mensagem de erro", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#email").fill("naoexiste@test.com");
    await page.locator("#password").fill("senhaerrada");
    await page.locator('button[type="submit"]').click();

    // Deve mostrar erro sem redirecionar
    await expect(page.getByText(/Email ou senha incorretos/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("login como viewer → acessa org e vê projetos", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(E2E_VIEWER.email);
    await page.locator("#password").fill(E2E_VIEWER.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/(org\/select|org\/.+\/dashboard)/, { timeout: 15_000 });

    if (page.url().includes("/org/select")) {
      await page.getByText("E2E Org").first().click();
      await page.waitForURL("**/org/e2e-org/dashboard");
    }

    // Viewer deve ver o dashboard
    await expect(page).toHaveURL(/\/org\/e2e-org\/dashboard/);
  });

  test("rota protegida sem autenticação → redireciona para login", async ({ page }) => {
    await page.goto("/org/e2e-org/projects");

    // Deve redirecionar para login
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

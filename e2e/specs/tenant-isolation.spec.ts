/**
 * E2E — Isolamento multi-tenant
 *
 * Garante que um usuário autenticado em org-A não consegue acessar
 * recursos de org-B pelo URL.
 *
 * Usa storageState do OWNER (chromium-owner).
 * O OWNER pertence a AMBAS as orgs (e2e-org e e2e-org-b) — mas para
 * testar o isolamento usamos um slug inexistente ou um projeto de outra org.
 */
import { test, expect } from "@playwright/test";

test.describe("Isolamento multi-tenant", () => {
  test("acessar org inexistente → redireciona ou exibe 404", async ({ page }) => {
    // Tenta acessar uma org que não existe
    const response = await page.goto("/org/org-que-nao-existe/projects");

    // Deve ser 404 ou redirecionar para outra página
    const status = response?.status();
    const isBlocked =
      status === 404 ||
      status === 403 ||
      page.url().includes("/login") ||
      page.url().includes("/org/select");

    expect(isBlocked).toBe(true);
  });

  test("org-b existe: OWNER pode acessar dashboard de org-b", async ({ page }) => {
    // O owner pertence às duas orgs — deve conseguir acessar org-b
    await page.goto("/org/e2e-org-b/dashboard");

    // Não deve ser redirecionado para login ou select
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/org\/select/);
  });

  test("projetos de org-a não aparecem ao navegar para org-b", async ({ page }) => {
    // "Projeto Seed E2E" foi criado na org-a (e2e-org) pelo seed
    await page.goto("/org/e2e-org-b/projects");

    // Aguarda a página carregar
    await page.waitForURL(/\/org\/e2e-org-b\/projects/, { timeout: 10_000 });

    // Projeto da org-a NÃO deve aparecer na listagem de org-b
    // (org-b não tem projetos no seed)
    await expect(page.getByText("Projeto Seed E2E")).not.toBeVisible({ timeout: 5_000 });
  });

  test("URL direta para projeto de outra org → bloqueado (404 ou redirect)", async ({
    page,
  }) => {
    // ID inexistente neste contexto de org — simula cross-tenant
    const fakeProjectId = "proj-id-de-outra-org-00000000";
    const response = await page.goto(`/org/e2e-org-b/projects/${fakeProjectId}`);

    const status = response?.status();
    const blocked =
      status === 404 ||
      status === 403 ||
      page.url().includes("/login") ||
      page.url().includes("/org/select") ||
      page.url().includes("/e2e-org-b/projects") === false;

    expect(blocked).toBe(true);
  });
});

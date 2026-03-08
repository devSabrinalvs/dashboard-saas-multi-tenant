/**
 * E2E — Team: convites e permissões por role
 *
 * Fluxo 1 (OWNER): Navega para /team → vê lista de membros → InviteForm visível
 * Fluxo 2 (VIEWER): Navega para /team → lista de membros visível → InviteForm OCULTO
 *
 * Usa dois projetos de configuração:
 *   chromium-owner (padrão) para testes de OWNER
 *   chromium-viewer para testes de VIEWER (via storageState do viewer)
 */
import { test, expect } from "@playwright/test";
import * as path from "path";

const ORG_SLUG = "e2e-org";
const TEAM_URL = `/org/${ORG_SLUG}/team`;

// ── OWNER ────────────────────────────────────────────────────────────────────
// Os testes abaixo rodam no projeto "chromium-owner" (storageState=owner)

test.describe("Team — OWNER", () => {
  test("lista de membros é exibida", async ({ page }) => {
    await page.goto(TEAM_URL);

    // OWNER deve ver seu email na lista (e o viewer)
    await expect(page.getByText("owner@e2e.test")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("viewer@e2e.test")).toBeVisible({ timeout: 5_000 });
  });

  test("formulário de convite é visível para OWNER", async ({ page }) => {
    await page.goto(TEAM_URL);

    // InviteForm deve estar presente
    const inviteForm = page.getByTestId("invite-form");
    await expect(inviteForm).toBeVisible({ timeout: 8_000 });
  });

  test("convite inválido exibe erro de validação", async ({ page }) => {
    await page.goto(TEAM_URL);

    const inviteForm = page.getByTestId("invite-form");
    await expect(inviteForm).toBeVisible({ timeout: 8_000 });

    // Tenta submeter com email inválido
    await page.locator("#invite-email").fill("emailinvalido");
    await page.getByTestId("invite-submit-btn").click();

    // Não deve navegar — permanece na tela
    await expect(page).toHaveURL(new RegExp(TEAM_URL));
  });
});

// ── VIEWER ───────────────────────────────────────────────────────────────────
// Este describe é executado pelo projeto "chromium-viewer" (storageState=viewer)

test.describe("Team — VIEWER (permissões restritas)", () => {
  test.use({
    storageState: path.join(__dirname, "../.auth/viewer.json"),
  });

  test("viewer vê membros mas NÃO vê formulário de convite", async ({ page }) => {
    await page.goto(TEAM_URL);

    // Viewer deve conseguir ver a página
    await expect(page).toHaveURL(new RegExp(TEAM_URL), { timeout: 10_000 });

    // Lista de membros visível
    await expect(page.getByText("owner@e2e.test")).toBeVisible({ timeout: 8_000 });

    // InviteForm deve estar OCULTO para viewer (não tem permissão member:invite)
    await expect(page.getByTestId("invite-form")).not.toBeVisible();
  });

  test("viewer NÃO vê botão 'Novo Projeto' na página de projects", async ({ page }) => {
    await page.goto(`/org/${ORG_SLUG}/projects`);

    // Aguarda a página carregar
    await expect(page.getByText(/projetos/i).first()).toBeVisible({ timeout: 10_000 });

    // Botão de novo projeto deve estar ausente para viewer
    await expect(page.getByTestId("new-project-btn")).not.toBeVisible();
  });
});

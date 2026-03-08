/**
 * Auth Setup — faz login e salva storageState para reutilizar em specs.
 *
 * Gera:
 *   e2e/.auth/owner.json  — sessão do OWNER
 *   e2e/.auth/viewer.json — sessão do VIEWER
 *
 * Depende de: global-setup.ts (dados já existem no DB)
 */
import { test as setup } from "@playwright/test";
import * as path from "path";
import { E2E_OWNER, E2E_VIEWER, E2E_ORG } from "../helpers/db";

const OWNER_AUTH_FILE = path.join(__dirname, "../.auth/owner.json");
const VIEWER_AUTH_FILE = path.join(__dirname, "../.auth/viewer.json");

async function doLogin(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();

  // Aguarda redirecionamento para /org/select ou direto para dashboard
  await page.waitForURL(/\/(org\/select|org\/.+\/dashboard)/, { timeout: 10_000 });
}

setup("login como OWNER → salvar storageState", async ({ page }) => {
  await doLogin(page, E2E_OWNER.email, E2E_OWNER.password);

  // Se foi para /org/select e há múltiplas orgs, clica na e2e-org
  if (page.url().includes("/org/select")) {
    await page.getByText(E2E_ORG.name).click();
    await page.waitForURL(`**/org/${E2E_ORG.slug}/dashboard`);
  }

  await page.context().storageState({ path: OWNER_AUTH_FILE });
});

setup("login como VIEWER → salvar storageState", async ({ page }) => {
  await doLogin(page, E2E_VIEWER.email, E2E_VIEWER.password);

  // VIEWER provavelmente tem 1 org, vai direto
  if (page.url().includes("/org/select")) {
    await page.getByText(E2E_ORG.name).click();
    await page.waitForURL(`**/org/${E2E_ORG.slug}/dashboard`);
  }

  await page.context().storageState({ path: VIEWER_AUTH_FILE });
});

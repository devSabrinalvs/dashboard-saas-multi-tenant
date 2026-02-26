import { test, expect } from "@playwright/test";

/**
 * E2E test: Full multi-tenant flow
 * login -> criar org -> criar project -> convidar membro ->
 * membro aceita convite -> member não acessa ação admin
 */

const OWNER_EMAIL = "owner@test.com";
const MEMBER_EMAIL = "member@test.com";

test.describe("Full SaaS multi-tenant flow", () => {
  test("owner creates org, project, invites member, member has limited access", async ({
    page,
    context,
  }) => {
    // ─── Step 1: Owner logs in ──────────────────────────────────
    await page.goto("/login");
    await expect(page.getByText("Sign In")).toBeVisible();

    await page.getByLabel("Email").fill(OWNER_EMAIL);
    await page.getByRole("button", { name: /sign in with email/i }).click();

    // Should redirect to select-org page
    await page.waitForURL("**/select-org");
    await expect(page.getByText("Select Organization")).toBeVisible();

    // ─── Step 2: Create organization ────────────────────────────
    await page.getByText("Create New Organization").click();
    await page.getByLabel("Organization Name").fill("E2E Test Org");
    await expect(page.getByLabel("Slug")).toHaveValue("e2e-test-org");
    await page.getByRole("button", { name: "Create Organization" }).click();

    // Should redirect to dashboard
    await page.waitForURL("**/org/e2e-test-org/dashboard");
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("E2E Test Org")).toBeVisible();

    // ─── Step 3: Create project ─────────────────────────────────
    await page.getByRole("button", { name: "Projects" }).click();
    await page.waitForURL("**/org/e2e-test-org/projects");

    await page.getByRole("link", { name: "New Project" }).click();
    await page.waitForURL("**/org/e2e-test-org/projects/new");

    await page.getByLabel("Name").fill("E2E Project");
    await page.getByLabel("Description").fill("A test project");
    await page.getByRole("button", { name: "Create Project" }).click();

    await page.waitForURL("**/org/e2e-test-org/projects");
    await expect(page.getByText("E2E Project")).toBeVisible();

    // ─── Step 4: Invite member ──────────────────────────────────
    await page.getByRole("button", { name: "Members" }).click();
    await page.waitForURL("**/org/e2e-test-org/members");

    await page.getByLabel("Invite by email").fill(MEMBER_EMAIL);
    await page.getByRole("button", { name: "Send Invite" }).click();
    await expect(page.getByText("Invite sent!")).toBeVisible();

    // ─── Step 5: Member accepts invite ──────────────────────────
    // Get the invite token from the pending invites list
    const inviteToken = await page.evaluate(async () => {
      const response = await fetch(
        "/api/orgs/e2e-test-org/invites"
      );
      const invites = await response.json();
      return invites[0]?.token;
    });

    expect(inviteToken).toBeTruthy();

    // Open a new page as the member
    const memberPage = await context.newPage();
    await memberPage.goto("/login");
    await memberPage.getByLabel("Email").fill(MEMBER_EMAIL);
    await memberPage
      .getByRole("button", { name: /sign in with email/i })
      .click();
    await memberPage.waitForURL("**/select-org");

    // Accept invite via API
    await memberPage.evaluate(async (token) => {
      await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    }, inviteToken);

    // Reload to see the org
    await memberPage.reload();
    await expect(
      memberPage.getByText("E2E Test Org")
    ).toBeVisible();

    // ─── Step 6: Member navigates to org ────────────────────────
    await memberPage.getByText("E2E Test Org").click();
    await memberPage.waitForURL("**/org/e2e-test-org/dashboard");

    // ─── Step 7: Member cannot access admin actions ─────────────
    // Navigate to members page — invite form should NOT be visible
    await memberPage.getByRole("button", { name: "Members" }).click();
    await memberPage.waitForURL("**/org/e2e-test-org/members");

    // The invite form should not be visible for MEMBER role
    await expect(
      memberPage.getByLabel("Invite by email")
    ).not.toBeVisible();

    // Try to invite via API directly — should get 403
    const apiResponse = await memberPage.evaluate(async () => {
      const response = await fetch(
        "/api/orgs/e2e-test-org/invites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "hacker@test.com",
            role: "ADMIN",
          }),
        }
      );
      return response.status;
    });

    expect(apiResponse).toBe(403);

    // Try to delete project via API — should get 403
    const projectsResponse = await memberPage.evaluate(async () => {
      const response = await fetch(
        "/api/orgs/e2e-test-org/projects"
      );
      const projects = await response.json();
      if (projects.length > 0) {
        const deleteResponse = await fetch(
          `/api/orgs/e2e-test-org/projects/${projects[0].id}`,
          { method: "DELETE" }
        );
        return deleteResponse.status;
      }
      return 200;
    });

    expect(projectsResponse).toBe(403);

    await memberPage.close();
  });
});

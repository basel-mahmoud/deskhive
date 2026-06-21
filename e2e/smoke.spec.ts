import { test, expect } from "@playwright/test";

test.describe("marketing + auth surface", () => {
  test("landing renders hero, pricing and security sections", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /support desk/i }),
    ).toBeVisible();
    await expect(page.getByText(/Simple, seat-based pricing/i)).toBeVisible();
    await expect(
      page.getByText(/Forced row-level security/i),
    ).toBeVisible();
  });

  test("nav routes to sign-in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /^Sign in$/ }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
  });

  test("protected app route redirects to sign-in", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/sign-in|accounts/);
  });
});

import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/explore",
  "/explore/students",
  "/freelance",
  "/how-it-works",
  "/privacy",
  "/terms",
  "/login",
  "/register",
];

test.describe("public route smoke", () => {
  for (const route of publicRoutes) {
    test(`${route} renders without a client error`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

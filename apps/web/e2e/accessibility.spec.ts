import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations, violations.map(({ id, help }) => `${id}: ${help}`).join("\n")).toEqual([]);
}

const publicRoutes = [
  "/",
  "/explore",
  "/explore/students",
  "/freelance",
  "/how-it-works",
  "/privacy",
  "/terms",
];

test.describe("public page automated accessibility", () => {
  test.describe.configure({ mode: "serial" });

  for (const route of publicRoutes) {
    test(`${route} has no automatically detectable accessibility violations`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expectNoAxeViolations(page);
    });
  }
});

test.describe("accessibility regression coverage", () => {
  test("critical authentication forms expose accessible names and validation", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Bienvenido de vuelta" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toBeVisible();
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toBeVisible();

    await page.getByLabel("Correo electrónico").fill("invalid");
    await page.getByLabel("Contraseña", { exact: true }).fill("password");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.goto("/register");
    await expect(page.getByRole("textbox", { name: "Nombre completo" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toBeVisible();
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirmar contraseña", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mostrar contraseñas" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("password visibility control is keyboard reachable", async ({ page }) => {
    await page.goto("/login");
    const toggle = page.getByRole("button", { name: "Mostrar contraseña" });

    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("type", "text");

    await page.goto("/register");
    const registerToggle = page.getByRole("button", { name: "Mostrar contraseñas" });
    await registerToggle.focus();
    await expect(registerToggle).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("type", "text");
  });

  test("public pages respect reduced motion and do not reflow horizontally", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/register");

    const motion = await page.locator(".animate-fade-in-up").first().evaluate((element) => {
      const styles = getComputedStyle(element);
      return { animationDuration: styles.animationDuration, transitionDuration: styles.transitionDuration };
    });
    expect(parseFloat(motion.animationDuration)).toBeLessThanOrEqual(0.01);
    expect(parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.01);

    const widths = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
    expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
  });
});

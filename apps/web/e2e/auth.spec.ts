import { expect, test, type Page } from "@playwright/test";

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test.describe("public authentication hydration", () => {
  test("register page hydrates and supports selecting Estudiante", async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await page.goto("/register");

    const student = page.getByRole("button", { name: /Estudiante/ });
    await expect(student).toHaveAttribute("aria-pressed", "true");

    await page.getByLabel("Nombre completo").fill("Ada Lovelace");
    await page.getByLabel("Correo electrónico").fill("ada@example.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("Secure1!");
    await page.getByLabel("Confirmar contraseña", { exact: true }).fill("Secure1!");
    await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test("login page hydrates and enables submit", async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await page.goto("/login");

    const submit = page.getByRole("button", { name: "Ingresar" });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Correo electrónico").fill("ada@example.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("Secure1!");
    await expect(submit).toBeEnabled();
    expect(errors).toEqual([]);
  });
});

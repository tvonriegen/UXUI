import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  registerAccount: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; href: string; className?: string }) => createElement("a", props, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null, isLoading: false, login: mocks.login, logout: vi.fn() }),
}));

vi.mock("@/app/actions/auth", () => ({
  registerAccount: mocks.registerAccount,
}));

vi.mock("@/lib/analytics", () => ({
  trackAnalyticsEvent: vi.fn(),
}));

describe("auth pages", () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.registerAccount.mockReset();
    mocks.replace.mockReset();
  });

  it("allows selecting Estudiante and enables registration after all fields are filled", async () => {
    const user = userEvent.setup();
    mocks.registerAccount.mockResolvedValue({ success: true, requiresEmailVerification: false });
    render(createElement(RegisterPage));

    const company = screen.getByRole("button", { name: /Empresa/ });
    const student = screen.getByRole("button", { name: /Estudiante/ });
    const submit = screen.getByRole("button", { name: "Crear cuenta" });

    expect(student).toHaveAttribute("aria-pressed", "true");
    expect(company).toHaveAttribute("aria-pressed", "false");

    await user.type(screen.getByLabelText("Nombre completo"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Correo electrónico"), "ada@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Secure1!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Secure1!");

    expect(submit).toBeEnabled();
    await user.click(submit);
    await waitFor(() => expect(mocks.registerAccount).toHaveBeenCalledWith(expect.objectContaining({ accountType: "student" })));
  });

  it("enables login after email and password are entered", async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValue({ error: null });
    render(createElement(LoginPage));

    const submit = screen.getByRole("button", { name: "Ingresar" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Correo electrónico"), "ada@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Secure1!");
    expect(submit).toBeEnabled();

    await user.click(submit);
    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith("ada@example.com", "Secure1!"));
    expect(mocks.replace).toHaveBeenCalledWith("/");
  });

  it("shows an authentication error without redirecting", async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValue({ error: "invalid login" });
    render(createElement(LoginPage));

    await user.type(screen.getByLabelText("Correo electrónico"), "ada@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Secure1!");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Correo o contraseña incorrectos.")).toBeVisible();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

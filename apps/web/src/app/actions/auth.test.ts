import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerAccount } from "@/app/actions/auth";

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: mocks.createUser, deleteUser: mocks.deleteUser } },
    from: mocks.from,
  }),
}));

describe("registerAccount", () => {
  beforeEach(() => {
    mocks.createUser.mockReset();
    mocks.deleteUser.mockReset();
    mocks.from.mockReset();
    mocks.upsert.mockReset();
    mocks.createUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.from.mockImplementation(() => ({ upsert: mocks.upsert }));
  });

  it("creates a public account with immediate email confirmation", async () => {
    const result = await registerAccount({
      name: "Prueba Estudiante",
      email: "externo@example.com",
      password: "SecurePassword1!",
      confirmPassword: "SecurePassword1!",
      accountType: "student",
    });

    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "externo@example.com",
      email_confirm: true,
      app_metadata: { account_type: "student" },
      user_metadata: { account_type: "student", role: "Estudiante", name: "Prueba Estudiante" },
    }));
    expect(result).toEqual({ success: true });
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.from).toHaveBeenNthCalledWith(1, "profiles");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "student_profiles");
  });

  it("cleans up the auth user when profile creation fails", async () => {
    mocks.upsert.mockResolvedValueOnce({ error: { message: "profile failed" } });

    const result = await registerAccount({
      name: "Prueba Estudiante", email: "externo@example.com",
      password: "SecurePassword1!", confirmPassword: "SecurePassword1!", accountType: "student",
    });

    expect(result).toEqual({ error: "profile failed" });
    expect(mocks.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("cleans up the auth user when company detail creation fails", async () => {
    mocks.upsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "company detail failed" } });

    const result = await registerAccount({
      name: "Prueba Empresa", email: "empresa@example.com",
      password: "SecurePassword1!", confirmPassword: "SecurePassword1!", accountType: "company",
    });

    expect(result).toEqual({ error: "company detail failed" });
    expect(mocks.from).toHaveBeenNthCalledWith(1, "profiles");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "company_profiles");
    expect(mocks.deleteUser).toHaveBeenCalledWith("user-1");
  });
});

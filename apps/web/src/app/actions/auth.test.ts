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

  it("creates a public account with email confirmation temporarily bypassed", async () => {
    const result = await registerAccount({
      name: "Prueba Estudiante",
      email: "externo@example.com",
      password: "Secure1!",
      confirmPassword: "Secure1!",
      accountType: "student",
    });

    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "externo@example.com",
      email_confirm: true,
      app_metadata: { account_type: "student" },
    }));
    expect(result).toEqual({ success: true, requiresEmailVerification: false });
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.from).toHaveBeenNthCalledWith(1, "profiles");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "student_profiles");
  });
});

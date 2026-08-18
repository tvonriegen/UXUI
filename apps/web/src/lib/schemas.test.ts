import { describe, expect, it } from "vitest";
import { createStudentSchema, loginSchema, passwordSchema, registerSchema } from "@/lib/schemas";

describe("auth schemas", () => {
  it.each(["company", "student"])("accepts public account type %s", (accountType) => {
    const result = registerSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "SecurePassword1!",
      confirmPassword: "SecurePassword1!",
      accountType,
    });

    expect(result.success).toBe(true);
  });

  it("rejects controlled account types", () => {
    const result = registerSchema.safeParse({
      name: "Alan Turing",
      email: "alan@example.com",
      password: "SecurePassword1!",
      confirmPassword: "SecurePassword1!",
      accountType: "external",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "SecurePassword1!",
      confirmPassword: "DifferentPassword1!",
      accountType: "student",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("requires a password for login", () => {
    const result = loginSchema.safeParse({ email: "ada@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("shares the hardened password policy with student creation", () => {
    expect(passwordSchema.safeParse("Secure1!").success).toBe(false);
    expect(createStudentSchema.shape.tempPassword.safeParse("SecurePassword1!").success).toBe(true);
  });
});

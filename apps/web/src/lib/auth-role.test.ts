import { describe, expect, it } from "vitest";
import { resolveAuthRole } from "./auth-role";

describe("resolveAuthRole", () => {
  it("keeps external accounts on the external navigation guard", () => {
    expect(resolveAuthRole("external", "graduated")).toBe("Externo");
  });

  it("uses the student stage only for student accounts", () => {
    expect(resolveAuthRole("student", "graduated")).toBe("Egresado");
    expect(resolveAuthRole("company", "graduated")).toBe("Empresa");
  });
});

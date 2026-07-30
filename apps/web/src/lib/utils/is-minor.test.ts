import { describe, expect, it } from "vitest";
import { isMinorProfile } from "@/lib/utils/is-minor";

describe("isMinorProfile", () => {
  it("treats an unknown student age as minor", () => {
    expect(isMinorProfile("Estudiante", null)).toBe(true);
  });

  it("treats students under 18 as minor", () => {
    expect(isMinorProfile("Estudiante", 17)).toBe(true);
  });

  it("does not treat adults or other roles as minor", () => {
    expect(isMinorProfile("Estudiante", 18)).toBe(false);
    expect(isMinorProfile("Egresado", 17)).toBe(false);
  });
});

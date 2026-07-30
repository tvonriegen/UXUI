import { describe, expect, it } from "vitest";
import { decideContactPath } from "@/lib/services/contact-policy";

const base = {
  callerId: "company-1",
  callerRole: "Empresa",
  talentId: "student-1",
  talentRole: "Estudiante",
  talentAge: 16,
  talentSchoolId: "school-1",
};

describe("decideContactPath", () => {
  it("protects a minor through school approval", () => {
    expect(decideContactPath(base)).toEqual({ kind: "needs_school_approval", schoolId: "school-1" });
  });

  it("rejects minor contact without a school", () => {
    expect(decideContactPath({ ...base, talentSchoolId: null })).toEqual({ kind: "missing_school" });
  });

  it("allows direct company contact with adults and graduates", () => {
    expect(decideContactPath({ ...base, talentAge: 18 })).toEqual({ kind: "direct" });
    expect(decideContactPath({ ...base, talentRole: "Egresado", talentAge: null })).toEqual({ kind: "direct" });
  });

  it("rejects self-contact and unknown roles explicitly", () => {
    expect(decideContactPath({ ...base, talentId: base.callerId })).toEqual({ kind: "self" });
    expect(decideContactPath({ ...base, callerRole: "Unknown" })).toEqual({ kind: "unknown_role", role: "Unknown" });
  });
});

import { describe, expect, it } from "vitest";
import { computeApplicationReadiness, type ApplicationReadinessInput } from "@/lib/utils/application-readiness";

const readyInput: ApplicationReadinessInput = {
  isAuthenticated: true,
  profile: { status: "loaded", specialty: "Electricidad", bio: "Perfil técnico", availability: "Disponible" },
  skills: { status: "loaded", names: ["PLC"] },
  evidence: { status: "loaded", portfolioCount: 1, certificationCount: 1 },
  opportunity: { id: "opportunity-1", active: true, title: "Práctica" },
  application: { hasApplied: false, isApplying: false },
  match: { score: 80, label: "Excelente" },
};

describe("computeApplicationReadiness", () => {
  it("allows applying when there are no hard blockers", () => {
    const result = computeApplicationReadiness(readyInput);

    expect(result.canApply).toBe(true);
    expect(result.overallState).toBe("ready");
    expect(result.blockingIssues).toHaveLength(0);
  });

  it("keeps incomplete optional profile data as recommendations", () => {
    const result = computeApplicationReadiness({
      ...readyInput,
      profile: { status: "loaded" },
      skills: { status: "loaded", names: [] },
      evidence: { status: "loaded", portfolioCount: 0, certificationCount: 0 },
    });

    expect(result.canApply).toBe(true);
    expect(result.overallState).toBe("recommended");
    expect(result.blockingIssues).toHaveLength(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it.each([
    { name: "not authenticated", patch: { isAuthenticated: false } },
    { name: "closed opportunity", patch: { opportunity: { id: "opportunity-1", active: false } } },
    { name: "already applied", patch: { application: { hasApplied: true, isApplying: false } } },
    { name: "in-flight application", patch: { application: { hasApplied: false, isApplying: true } } },
  ])("blocks a hard condition: $name", ({ patch }) => {
    const result = computeApplicationReadiness({ ...readyInput, ...patch } as ApplicationReadinessInput);
    expect(result.canApply).toBe(false);
    expect(result.overallState).toBe("blocked");
    expect(result.blockingIssues.length).toBeGreaterThan(0);
  });
});

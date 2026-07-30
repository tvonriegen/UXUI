import { describe, expect, it } from "vitest";
import { computeExplainableMatch, computeMatchScore, getMatchColor, getMatchLabel } from "@/lib/utils/matching";

const job = {
  id: "job-1",
  title: "Práctica de electricidad industrial",
  description: "Trabajo con tableros y AutoCAD Electrical.",
  specialty: "Instalaciones Eléctricas",
  type: "pasantia",
};

describe("matching", () => {
  it("normalizes accents and awards specialty, skill and practice points", () => {
    expect(computeMatchScore(["AutoCAD Electrical", "Tableros"], "Instalaciones Electricas", job)).toBe(70);
  });

  it("caps skill points at 50", () => {
    const skills = ["uno", "dos", "tres", "cuatro", "cinco", "seis"].map((skill) => `${skill} ${job.title}`);
    const result = computeExplainableMatch({ ...job, description: skills.join(" ") }, job.specialty, skills);

    expect(result.factors.skills.awarded).toBe(50);
    expect(result.factors.skills.capped).toBe(true);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it.each([
    [80, "Excelente", "emerald"],
    [60, "Bueno", "cyan"],
    [40, "Regular", "amber"],
    [39, "Bajo", "slate"],
  ] as const)("maps score %s to its label and color", (score, label, color) => {
    expect(getMatchLabel(score)).toBe(label);
    expect(getMatchColor(score)).toBe(color);
  });
});

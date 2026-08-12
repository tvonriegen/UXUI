import { describe, expect, it } from "vitest";
import { resolveApplicationOpportunityId, resolveApplicationTarget } from "@/lib/services/opportunities";

describe("opportunity/application compatibility adapter", () => {
  it("prefers canonical ids during coexistence", () => {
    expect(resolveApplicationOpportunityId({ job_id: "legacy", opportunity_id: "canonical" })).toBe("canonical");
    expect(resolveApplicationTarget({ job_id: "legacy", opportunity_id: "canonical" }))
      .toEqual({ column: "opportunity_id", id: "canonical" });
  });

  it("falls back to legacy applications", () => {
    expect(resolveApplicationOpportunityId({ job_id: "legacy", opportunity_id: null })).toBe("legacy");
    expect(resolveApplicationTarget({ job_id: "legacy" })).toEqual({ column: "job_id", id: "legacy" });
  });

  it("returns no target for incomplete rows", () => {
    expect(resolveApplicationOpportunityId({})).toBeNull();
    expect(resolveApplicationTarget({ opportunity_id: null, job_id: null })).toBeNull();
  });
});

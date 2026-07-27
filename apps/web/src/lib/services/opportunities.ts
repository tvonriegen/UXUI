import type { Opportunity } from "@/lib/types";

export interface LegacyJobPosting {
  id: string;
  title: string;
  description: string;
  location: string;
  type: string;
  specialty: string;
  salary_min: number | null;
  salary_max: number | null;
  active: boolean;
  created_at: string;
  company_id: string;
  max_candidates: number | null;
  views_count: number;
  company?: { name: string; avatar: string };
}

export function opportunityToLegacyJob(opportunity: Opportunity): LegacyJobPosting {
  return {
    id: opportunity.id,
    title: opportunity.title,
    description: opportunity.description,
    location: opportunity.location,
    type: opportunity.opportunity_type === "internship" ? "pasantia" : opportunity.opportunity_type,
    specialty: opportunity.specialty,
    salary_min: opportunity.compensation_min,
    salary_max: opportunity.compensation_max,
    active: opportunity.status === "open",
    created_at: opportunity.created_at,
    company_id: opportunity.publisher_id,
    max_candidates: opportunity.max_candidates,
    views_count: opportunity.views_count,
  };
}

/** Prefer legacy rows while their joins and UI fields are still in use. */
export function mergeOpportunitySources(
  canonical: Opportunity[],
  legacy: LegacyJobPosting[],
): LegacyJobPosting[] {
  const legacyIds = new Set(legacy.map((row) => row.id));
  return [
    ...legacy,
    ...canonical.filter((row) => !legacyIds.has(row.id)).map(opportunityToLegacyJob),
  ];
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateApplicationStatus, updateApplicationStatusSA } from "@/app/actions/company";

const mocks = vi.hoisted(() => ({
  adminFrom: vi.fn(),
  createAdminClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  getUser: vi.fn(),
  scenario: "success" as string,
  updateRows: [{ id: "application-1" }],
  notificationInsert: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: mocks.createAdminClient,
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

function makeBuilder(table: string) {
  let operation = "select";
  let requestedJobId: string | undefined;
  const builder = {
    select: vi.fn((selection: string) => {
      operation = selection === "id" && table === "job_applications" ? "update-select" : selection;
      return builder;
    }),
    update: vi.fn(() => {
      operation = "update";
      return builder;
    }),
    eq: vi.fn((column: string, value: string) => {
      if (column === "job_id") requestedJobId = value;
      return builder;
    }),
    in: vi.fn(() => builder),
    single: vi.fn(async () => {
      if (table === "profiles") {
        if (mocks.scenario === "anonymous") return { data: null };
        return {
          data: mocks.scenario === "unauthorized"
            ? { id: "company-a", account_type: "student", account_status: "active", name: "A" }
            : { id: "company-a", account_type: "company", account_status: "active", name: "A", company_name: "Company A" },
        };
      }
      if (table === "job_applications") {
        if (["company-b", "mismatch", "missing"].includes(mocks.scenario)) return { data: null };
        return {
          data: {
            id: "application-1",
            applicant_id: "db-applicant",
            job_id: "job-a",
            job_postings: { company_id: "company-a", title: "DB title", max_candidates: null },
          },
        };
      }
      return { data: null };
    }),
    then: (resolve: (value: unknown) => unknown) => resolve(
      operation === "update-select"
        ? { data: requestedJobId === "wrong-job" ? [] : mocks.updateRows, error: null }
        : { data: null, error: null },
    ),
  };
  return builder;
}

describe("company application status actions", () => {
  beforeEach(() => {
    mocks.scenario = "success";
    mocks.updateRows = [{ id: "application-1" }];
    mocks.getUser.mockResolvedValue({ data: { user: { id: "company-a" } } });
    mocks.createServerSupabaseClient.mockImplementation(() => ({
      auth: { getUser: mocks.getUser },
      from: (table: string) => makeBuilder(table),
    }));
    mocks.notificationInsert.mockResolvedValue({ error: null });
    mocks.adminFrom.mockImplementation((table: string) => ({ insert: mocks.notificationInsert, table }));
    mocks.createAdminClient.mockReturnValue({ from: mocks.adminFrom });
  });

  it("allows Company A to update its application", async () => {
    await expect(updateApplicationStatusSA("application-1", "job-a", "accepted")).resolves.toEqual({ success: true });
  });

  it("does not allow Company A to update Company B's application", async () => {
    mocks.scenario = "company-b";
    await expect(updateApplicationStatusSA("application-1", "job-b", "accepted")).resolves.toEqual(expect.objectContaining({ error: expect.any(String) }));
  });

  it("rejects mismatched and nonexistent application identifiers", async () => {
    mocks.scenario = "mismatch";
    await expect(updateApplicationStatusSA("application-1", "wrong-job", "accepted")).resolves.toEqual(expect.objectContaining({ error: expect.any(String) }));
    mocks.scenario = "missing";
    await expect(updateApplicationStatusSA("missing", "job-a", "accepted")).resolves.toEqual(expect.objectContaining({ error: expect.any(String) }));
  });

  it("rejects anonymous and non-company callers", async () => {
    mocks.scenario = "anonymous";
    await expect(updateApplicationStatusSA("application-1", "job-a", "accepted")).resolves.toEqual({ error: "Acceso denegado." });
    mocks.scenario = "unauthorized";
    await expect(updateApplicationStatusSA("application-1", "job-a", "accepted")).resolves.toEqual({ error: "Acceso denegado." });
  });

  it("rejects invalid statuses and an update that affects zero rows", async () => {
    await expect(updateApplicationStatusSA("application-1", "job-a", "not-a-status" as never)).resolves.toEqual({ error: "Parámetros inválidos." });
    mocks.updateRows = [];
    await expect(updateApplicationStatusSA("application-1", "job-a", "accepted")).resolves.toEqual({ error: "No se pudo actualizar la aplicación." });
  });

  it("uses database-derived applicant and title for legacy notifications", async () => {
    await expect(updateApplicationStatus("application-1", "accepted", "client-applicant", "Client title")).resolves.toEqual({ success: true });
    expect(mocks.notificationInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "db-applicant",
      body: expect.stringContaining("DB title"),
    }));
    expect(mocks.notificationInsert).not.toHaveBeenCalledWith(expect.objectContaining({
      user_id: "client-applicant",
      body: expect.stringContaining("Client title"),
    }));
  });
});

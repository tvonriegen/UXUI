import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchOwnProfile } from "./own-profile-query";

function missingRpcError() {
  return {
    code: "PGRST202",
    message: "Could not find the function public.get_own_profile",
    details: "",
    hint: "",
  };
}

describe("fetchOwnProfile", () => {
  it("uses the hardened RPC when it is available", async () => {
    const from = vi.fn();
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ profile: { id: "user-1", account_type: "student" } }],
        error: null,
      }),
      from,
    } as unknown as SupabaseClient;

    await expect(fetchOwnProfile(client, "user-1")).resolves.toMatchObject({
      profile: { id: "user-1", account_type: "student" },
      error: null,
      source: "rpc",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("falls back to the owner profile when the RPC is missing", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "user-1", name: "Ada", account_type: "student", account_status: "active" },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: missingRpcError() }),
      from: vi.fn().mockReturnValue({ select }),
    } as unknown as SupabaseClient;

    await expect(fetchOwnProfile(client, "user-1")).resolves.toMatchObject({
      profile: { id: "user-1", name: "Ada", account_type: "student" },
      error: null,
      source: "profiles",
    });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("uses the allowlisted projection requested by a consumer", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "user-1", xp: 120, level: 2 },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: missingRpcError() }),
      from: vi.fn().mockReturnValue({ select }),
    } as unknown as SupabaseClient;

    await expect(
      fetchOwnProfile<{ id: string; xp: number; level: number }>(
        client,
        "user-1",
        "id, xp, level",
      ),
    ).resolves.toMatchObject({
      profile: { id: "user-1", xp: 120, level: 2 },
      source: "profiles",
    });
    expect(select).toHaveBeenCalledWith("id, xp, level");
  });

  it("does not bypass RPC authorization or infrastructure errors", async () => {
    const from = vi.fn();
    const error = { ...missingRpcError(), code: "42501", message: "permission denied" };
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error }),
      from,
    } as unknown as SupabaseClient;

    await expect(fetchOwnProfile(client, "user-1")).resolves.toEqual({
      profile: null,
      error,
      source: "rpc",
    });
    expect(from).not.toHaveBeenCalled();
  });
});

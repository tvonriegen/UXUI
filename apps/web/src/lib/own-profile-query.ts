import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { unwrapOwnProfile } from "./own-profile";
import type { AccountType, Role, StudentStage } from "./types";

export interface OwnProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: Role | null;
  account_type?: AccountType | null;
  account_status?: "active" | "pending" | "suspended" | "disabled" | null;
  availability?: string | null;
  student_stage?: StudentStage | null;
}

export interface OwnProfileResult<T extends object = OwnProfile> {
  profile: T | null;
  error: PostgrestError | null;
  source: "rpc" | "profiles";
}

const DEFAULT_PROFILE_COLUMNS =
  "id, name, role, avatar, availability, account_type, account_status";

export function isMissingRpcError(error: Pick<PostgrestError, "code">): boolean {
  return error.code === "PGRST202" || error.code === "42883";
}

/**
 * Prefer the hardened RPC. During a controlled rollout, fall back to the
 * owner-only profiles projection only when PostgREST confirms that the RPC is
 * absent. RLS and column grants remain the authorization boundary.
 */
export async function fetchOwnProfile<T extends object = OwnProfile>(
  client: SupabaseClient,
  userId: string,
  fallbackColumns = DEFAULT_PROFILE_COLUMNS,
): Promise<OwnProfileResult<T>> {
  const { data: ownProfileRows, error: rpcError } = await client.rpc("get_own_profile");

  if (!rpcError) {
    return {
      profile: unwrapOwnProfile(ownProfileRows as Array<{ profile: T }> | null),
      error: null,
      source: "rpc",
    };
  }

  if (!isMissingRpcError(rpcError)) {
    return { profile: null, error: rpcError, source: "rpc" };
  }

  const { data: profile, error } = await client
    .from("profiles")
    .select(fallbackColumns)
    .eq("id", userId)
    .maybeSingle();

  return {
    profile: profile as T | null,
    error,
    source: "profiles",
  };
}

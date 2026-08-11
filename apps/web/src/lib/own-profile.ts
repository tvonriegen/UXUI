export type OwnProfileRpcRow<T> = { profile: T };

export function unwrapOwnProfile<T>(
  data: OwnProfileRpcRow<T>[] | null | undefined,
): T | null {
  return data?.[0]?.profile ?? null;
}

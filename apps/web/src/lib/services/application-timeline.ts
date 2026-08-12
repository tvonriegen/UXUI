export type TimelineEventType =
  | "readiness_checked"
  | "applied"
  | "viewed"
  | "reviewing"
  | "interviewing"
  | "accepted"
  | "rejected"
  | "hired"
  | "note";

export type LegacyApplicationStatus =
  | "pending"
  | "reviewing"
  | "interviewing"
  | "accepted"
  | "rejected"
  | "hired";

export interface ApplicationTimelineEvent {
  id: string;
  event_type: TimelineEventType;
  created_at: string;
  note: string;
  metadata?: Record<string, unknown> | null;
}

export interface LegacyApplicationProgress {
  status: LegacyApplicationStatus;
  created_at: string;
}

const LEGACY_STATUS_EVENT: Record<LegacyApplicationStatus, TimelineEventType> = {
  pending: "applied",
  reviewing: "reviewing",
  interviewing: "interviewing",
  accepted: "accepted",
  rejected: "rejected",
  hired: "hired",
};

/**
 * Canonical application_events are authoritative. The legacy application row
 * is only used as a reversible read fallback while older applications may not
 * have a timeline event yet.
 */
export function resolveApplicationTimeline(
  canonicalEvents: ApplicationTimelineEvent[],
  legacyProgress?: LegacyApplicationProgress | null,
): ApplicationTimelineEvent[] {
  if (canonicalEvents.length > 0) return normalizeCanonicalTimeline(canonicalEvents);
  if (!legacyProgress) return [];

  return [{
    id: `legacy-status:${legacyProgress.created_at}`,
    event_type: LEGACY_STATUS_EVENT[legacyProgress.status],
    created_at: legacyProgress.created_at,
    note: "",
  }];
}

/**
 * Adds a newly received canonical event without allowing the temporary legacy
 * fallback or realtime retries to create duplicate/out-of-order entries.
 */
export function mergeApplicationTimelineEvents(
  currentEvents: ApplicationTimelineEvent[],
  incomingEvent: ApplicationTimelineEvent,
): ApplicationTimelineEvent[] {
  const canonicalEvents = currentEvents.filter((event) => !event.id.startsWith("legacy-status:"));
  if (canonicalEvents.some((event) => event.id === incomingEvent.id)) {
    return normalizeCanonicalTimeline(canonicalEvents);
  }

  return normalizeCanonicalTimeline([...canonicalEvents, incomingEvent]);
}

function normalizeCanonicalTimeline(events: ApplicationTimelineEvent[]): ApplicationTimelineEvent[] {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
}

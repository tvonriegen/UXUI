import { describe, expect, it } from "vitest";
import {
  mergeApplicationTimelineEvents,
  resolveApplicationTimeline,
  type ApplicationTimelineEvent,
} from "@/lib/services/application-timeline";

const canonicalEvent: ApplicationTimelineEvent = {
  id: "event-1",
  event_type: "applied",
  created_at: "2026-08-11T10:00:00.000Z",
  note: "",
};

describe("application timeline compatibility adapter", () => {
  it("uses the legacy status when an older application has no events", () => {
    expect(resolveApplicationTimeline([], {
      status: "interviewing",
      created_at: "2026-08-10T10:00:00.000Z",
    })).toEqual([{
      id: "legacy-status:2026-08-10T10:00:00.000Z",
      event_type: "interviewing",
      created_at: "2026-08-10T10:00:00.000Z",
      note: "",
    }]);
  });

  it("prefers canonical history during coexistence", () => {
    expect(resolveApplicationTimeline([canonicalEvent], {
      status: "rejected",
      created_at: "2026-08-10T10:00:00.000Z",
    })).toEqual([canonicalEvent]);
  });

  it("returns an empty timeline when neither source has progress", () => {
    expect(resolveApplicationTimeline([], null)).toEqual([]);
  });

  it("keeps canonical events ordered and unique during realtime updates", () => {
    const laterEvent = { ...canonicalEvent, id: "event-2", event_type: "reviewing" as const,
      created_at: "2026-08-11T12:00:00.000Z" };
    const earlierEvent = { ...canonicalEvent, id: "event-0", created_at: "2026-08-11T09:00:00.000Z" };

    expect(mergeApplicationTimelineEvents([laterEvent, canonicalEvent], earlierEvent))
      .toEqual([earlierEvent, canonicalEvent, laterEvent]);
    expect(mergeApplicationTimelineEvents([canonicalEvent], canonicalEvent))
      .toEqual([canonicalEvent]);
  });

  it("drops the legacy fallback as soon as a canonical event arrives", () => {
    const legacyFallback: ApplicationTimelineEvent = {
      id: "legacy-status:2026-08-10T10:00:00.000Z",
      event_type: "interviewing",
      created_at: "2026-08-10T10:00:00.000Z",
      note: "",
    };

    expect(mergeApplicationTimelineEvents([legacyFallback], canonicalEvent))
      .toEqual([canonicalEvent]);
  });
});

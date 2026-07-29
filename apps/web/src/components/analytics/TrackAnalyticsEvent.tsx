"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

export default function TrackAnalyticsEvent({ eventName }: { eventName: string }) {
  useEffect(() => {
    trackAnalyticsEvent(eventName);
  }, [eventName]);

  return null;
}

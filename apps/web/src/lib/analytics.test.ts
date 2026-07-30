import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_KEY,
  restoreAnalyticsConsent,
} from "@/lib/analytics";

describe("restoreAnalyticsConsent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.gtag;
  });

  it.each(["granted", "denied"] as const)(
    "restores a persisted %s choice in Google Consent Mode",
    (consent) => {
      const gtag = vi.fn();
      window.gtag = gtag;
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);

      expect(restoreAnalyticsConsent()).toBe(consent);
      expect(gtag).toHaveBeenCalledOnce();
      expect(gtag).toHaveBeenCalledWith("consent", "update", {
        analytics_storage: consent,
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    },
  );

  it("keeps the default denied state when no choice was persisted", () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    expect(restoreAnalyticsConsent()).toBeNull();
    expect(gtag).not.toHaveBeenCalled();
  });
});

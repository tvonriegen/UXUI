"use client";

export const ANALYTICS_CONSENT_KEY = "talenthub_analytics_consent";
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export type AnalyticsConsent = "granted" | "denied";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isValidMeasurementId(value: string | undefined): value is string {
  return Boolean(value && /^G-[A-Z0-9]+$/.test(value));
}

export function isAnalyticsConfigured(): boolean {
  return isValidMeasurementId(GA_MEASUREMENT_ID);
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;

  const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function updateAnalyticsConsent(consent: AnalyticsConsent): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("consent", "update", {
    analytics_storage: consent,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function saveAnalyticsConsent(consent: AnalyticsConsent): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  updateAnalyticsConsent(consent);
  window.dispatchEvent(new Event("talenthub:analytics-consent"));
}

export function trackAnalyticsEvent(
  eventName: string,
  parameters: Record<string, string | number | boolean> = {},
): void {
  if (!isAnalyticsConfigured() || readAnalyticsConsent() !== "granted") return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", eventName, {
    ...parameters,
    send_to: GA_MEASUREMENT_ID,
  });
}

function normalizePathname(pathname: string): string {
  const protectedPrefixes = ["/student", "/company", "/school", "/external"];
  const protectedPrefix = protectedPrefixes.find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (protectedPrefix) return protectedPrefix;

  const dynamicPrefixes = ["/explore/students/", "/freelance/", "/empresa/"];
  const dynamicPrefix = dynamicPrefixes.find((prefix) => pathname.startsWith(prefix));
  if (dynamicPrefix) return `${dynamicPrefix}:id`;

  return pathname
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:id");
}

export function trackPageView(pathname: string): void {
  if (!isAnalyticsConfigured() || readAnalyticsConsent() !== "granted") return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const safePathname = normalizePathname(pathname || "/");
  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: `${window.location.origin}${safePathname}`,
    page_path: safePathname,
    send_to: GA_MEASUREMENT_ID,
  });
}

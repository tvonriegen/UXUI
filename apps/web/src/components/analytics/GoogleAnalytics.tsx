"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  GA_MEASUREMENT_ID,
  isAnalyticsConfigured,
  readAnalyticsConsent,
  restoreAnalyticsConsent,
  saveAnalyticsConsent,
  trackPageView,
  type AnalyticsConsent,
} from "@/lib/analytics";

const DEFAULT_CONSENT_SCRIPT = `
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
`;

function ConsentBanner({
  consent,
  onConsentChange,
  onManagePreferences,
}: {
  consent: AnalyticsConsent | null | undefined;
  onConsentChange: (nextConsent: AnalyticsConsent) => void;
  onManagePreferences: () => void;
}) {
  if (consent === undefined) return null;

  if (consent !== null) {
    return (
      <button
        type="button"
        onClick={onManagePreferences}
        className="fixed bottom-4 left-4 z-50 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-lg hover:bg-slate-50"
        aria-label="Cambiar preferencias de analítica"
      >
        Preferencias de privacidad
      </button>
    );
  }

  return (
    <aside
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      aria-label="Preferencias de privacidad"
      role="dialog"
      aria-live="polite"
    >
      <p className="text-sm font-bold text-slate-900">Privacidad y analítica</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Usamos Google Analytics para comprender el uso agregado de TalentHub y mejorar el servicio.
        No enviamos nombres, correos, identificadores personales ni datos de perfiles.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onConsentChange("granted")}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
        >
          Aceptar analítica
        </button>
        <button
          type="button"
          onClick={() => onConsentChange("denied")}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Rechazar
        </button>
        <a
          href="/privacy"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
        >
          Ver privacidad
        </a>
      </div>
    </aside>
  );
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<AnalyticsConsent | null | undefined>(undefined);

  useEffect(() => {
    const syncConsent = () => {
      setConsent(readAnalyticsConsent());
    };

    setConsent(restoreAnalyticsConsent());
    window.addEventListener("talenthub:analytics-consent", syncConsent);
    return () => window.removeEventListener("talenthub:analytics-consent", syncConsent);
  }, []);

  useEffect(() => {
    if (consent === "granted" && pathname) trackPageView(pathname);
  }, [consent, pathname]);

  if (!isAnalyticsConfigured()) return null;

  const handleConsentChange = (nextConsent: AnalyticsConsent) => {
    saveAnalyticsConsent(nextConsent);
    setConsent(nextConsent);
  };

  return (
    <>
      {/* Consent must be queued before gtag.js starts collecting anything. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script id="google-analytics-consent" strategy="beforeInteractive">
        {DEFAULT_CONSENT_SCRIPT}
      </Script>
      <Script
        id="google-analytics-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`gtag('js', new Date()); gtag('config', ${JSON.stringify(GA_MEASUREMENT_ID)}, { send_page_view: false });`}
      </Script>
      <ConsentBanner
        consent={consent}
        onConsentChange={handleConsentChange}
        onManagePreferences={() => setConsent(null)}
      />
    </>
  );
}

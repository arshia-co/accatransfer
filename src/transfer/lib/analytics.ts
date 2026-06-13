/**
 * Simple analytics helper that sends events to Google Analytics 4 (gtag)
 * when available, and logs to console in development.
 *
 * Usage:
 *   import { trackEvent } from '@/lib/analytics';
 *   trackEvent('whatsapp_click', { location: 'hero' });
 */

type EventParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: string, params?: EventParams) {
  // Send to Google Analytics 4 if gtag is loaded
  if (typeof window !== "undefined" && "gtag" in window) {
    // @ts-expect-error gtag is injected by the GA4 script
    window.gtag("event", eventName, params);
  }

  // Also log in development for debugging
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[Analytics] ${eventName}`, params ?? {});
  }
}

/** Dedicated helper for WhatsApp CTA clicks */
export function trackWhatsAppClick(location: "hero" | "floating" | "dashboard") {
  trackEvent("whatsapp_click", {
    location,
    label: location === "hero" ? "WhatsApp consult — Hero" : location === "floating" ? "WhatsApp — Floating dock" : "WhatsApp — Dashboard support",
  });
}

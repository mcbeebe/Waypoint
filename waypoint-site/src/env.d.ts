/// <reference types="astro/client" />

/** Plausible's queue-capable global (loaded in BaseLayout; D3 taxonomy). */
interface Window {
  plausible?: (
    event: string,
    options?: { props?: Record<string, string | number>; callback?: () => void },
  ) => void;
  /** GA4's gtag.js global (loaded in BaseLayout alongside Plausible; D3 taxonomy). */
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}

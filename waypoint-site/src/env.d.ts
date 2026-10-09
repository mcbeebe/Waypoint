/// <reference types="astro/client" />

/** Plausible's queue-capable global (loaded in BaseLayout; D3 taxonomy). */
interface Window {
  plausible?: (
    event: string,
    options?: { props?: Record<string, string | number>; callback?: () => void },
  ) => void;
}

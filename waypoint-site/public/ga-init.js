// GA4 bootstrap (D3 "Providers"). A same-origin file, not an inline script:
// the CSP in vercel.json is script-src 'self' with no 'unsafe-inline', so an
// inline config block is blocked and GA4 never sends a hit. The Measurement
// ID arrives on this tag's data-ga-id (BaseLayout.astro).
//
// gtag MUST push the `arguments` object, not an array: gtag.js ignores array
// entries in dataLayer as commands, so `push(args)` with a rest param silently
// drops 'js' and 'config' too.
(function () {
  // One-time cleanup. Between 2026-10-02 (the CSP fix that first let gtag
  // run) and the deploy of the consent default below, gtag set _ga and
  // _ga_<id> with a two-year expiry on every visitor. Consent-denied gtag
  // never reads them, but they would sit on the device for two years under a
  // policy that says "No cookies" — so expire them, on every domain form
  // gtag may have used (bare host, host, and the registrable parent).
  document.cookie.split(';').forEach(function (c) {
    var name = c.split('=')[0].trim();
    if (name.indexOf('_ga') !== 0) return;
    var gone = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = gone;
    document.cookie = gone + '; domain=' + location.hostname;
    document.cookie = gone + '; domain=.' + location.hostname.replace(/^www\./, '');
  });

  var id = document.currentScript && document.currentScript.dataset.gaId;
  if (!id) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  // Consent Mode default: every storage type denied, declared BEFORE any
  // command that sends data (Google's ordering rule). gtag.js then sets no
  // _ga / _ga_* cookies and sends cookieless pings instead — a fresh random
  // id per page load, no cross-page or cross-visit identity. This is what
  // keeps the privacy policy's "No cookies" true. Trade: GA4 user/session
  // reports are modeled or unattributed; page views and D3 events still
  // arrive. Flipping analytics_storage to 'granted' re-enables cookies and
  // MUST be paired with a privacy-policy change (see privacy.mdx).
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', id, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
})();

// GA4 bootstrap (D3 "Providers"). A same-origin file, not an inline script:
// the CSP in vercel.json is script-src 'self' with no 'unsafe-inline', so an
// inline config block is blocked and GA4 never sends a hit. The Measurement
// ID arrives on this tag's data-ga-id (BaseLayout.astro).
//
// gtag MUST push the `arguments` object, not an array: gtag.js ignores array
// entries in dataLayer as commands, so `push(args)` with a rest param silently
// drops 'js' and 'config' too.
(function () {
  var id = document.currentScript && document.currentScript.dataset.gaId;
  if (!id) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
})();

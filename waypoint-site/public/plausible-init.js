// Plausible bootstrap (D3). Plausible's official snippet, moved out of an
// inline <script> because the CSP (vercel.json) is script-src 'self' with no
// 'unsafe-inline'. Must load BEFORE the async pa-*.js script, which replaces
// window.plausible once it loads and drains the queue.
window.plausible =
  window.plausible ||
  function () {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
window.plausible.init =
  window.plausible.init ||
  function (o) {
    window.plausible.o = o || {};
  };
window.plausible.init();

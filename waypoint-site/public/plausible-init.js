// Plausible bootstrap (D3). Plausible's official snippet, moved out of an
// inline <script> because the CSP (vercel.json) is script-src 'self' with no
// 'unsafe-inline'. Must load BEFORE the async pa-*.js script.
//
// Single dispatch point for D3 "Providers": every window.plausible(...) call
// also goes to GA4 with the same event name and props, so no call site needs
// its own gtag call. pa-*.js replaces window.plausible once it loads
// (`window.plausible = m`), which would silently drop the mirror for every
// event after load — so the setter below re-wraps whatever it assigns.
(function () {
  function mirror(fn) {
    var wrapped = function (event, options) {
      if (typeof window.gtag === 'function') {
        window.gtag('event', event, (options && options.props) || {});
      }
      return fn.apply(this, arguments);
    };
    return wrapped;
  }

  var current = mirror(function () {
    (current.q = current.q || []).push(arguments);
  });
  current.init = function (o) {
    current.o = o || {};
  };

  Object.defineProperty(window, 'plausible', {
    configurable: true,
    get: function () {
      return current;
    },
    // pa-*.js also runs `window.plausible = window.plausible || {}`, assigning
    // the wrapper back to itself; re-wrapping it would hide .o/.q from the
    // script (so it never initializes) and send every event to GA4 twice.
    set: function (fn) {
      if (fn === current) return;
      current = typeof fn === 'function' ? mirror(fn) : fn;
    },
  });

  window.plausible.init();
})();

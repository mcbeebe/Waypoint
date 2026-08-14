/**
 * Post-build step for the web export.
 *
 * Expo's `expo export -p web` produces a bare index.html. This script turns the
 * export into an installable PWA:
 *   1. Copies the PWA assets (manifest, icons, service worker) into dist/.
 *   2. Injects the manifest link, theme-color, apple-touch / standalone meta
 *      tags, and a service-worker registration into the generated index.html.
 *
 * Idempotent: safe to run repeatedly (skips injection if already present).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'public');
const indexPath = path.join(dist, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[postbuild-web] dist/index.html not found — run `expo export -p web` first.');
  process.exit(1);
}

// 1. Copy PWA assets into dist/
const assets = ['manifest.json', 'sw.js', 'icon-256.png', 'icon-512.png', 'apple-touch-icon.png'];
for (const file of assets) {
  const from = path.join(publicDir, file);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(dist, file));
  } else {
    console.warn(`[postbuild-web] missing public/${file}`);
  }
}

// 2. Inject head tags + SW registration
let html = fs.readFileSync(indexPath, 'utf8');

const HEAD_TAGS = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#1B2A4A" />
    <meta name="description" content="Navigation for parents of children with disabilities in California." />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Waypoint" />`;

const SW_SNIPPET = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function (e) {
            console.warn('SW registration failed', e);
          });
        });
      }
    </script>`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${HEAD_TAGS}\n  </head>`);
}
if (!html.includes("serviceWorker.register('/sw.js')")) {
  html = html.replace('</body>', `${SW_SNIPPET}\n  </body>`);
}

fs.writeFileSync(indexPath, html);
console.log('[postbuild-web] PWA assets copied and index.html patched.');

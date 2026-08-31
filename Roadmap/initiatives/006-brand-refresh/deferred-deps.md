# 006 — deferred dependencies checklist (fonts + app icon)

**Date:** 2026-08-31 · **Status:** open — needs an environment with npm-registry
and image tooling (the cloud session that built the brand refresh has its
package registry blocked by the proxy, so these two pieces were built to
degrade gracefully and are finished here).

Everything visual in the warm system already works with **system fallback
fonts** and the **Views-based marker** — this checklist swaps in the real
typefaces and generates the app-icon/favicon PNGs. Neither changes layout,
color, or behavior; both are drop-in.

Run from `waypoint-app/`.

---

## A. Real brand fonts — Newsreader (display) + Hanken Grotesk (body)

Until this runs, the kit renders in Georgia/system-sans (the fallbacks named in
`theme.ts` `brandType`). This makes the warm serif/sans actually render.

- [ ] **Install** the font packages + loader:
  ```bash
  npx expo install expo-font @expo-google-fonts/newsreader @expo-google-fonts/hanken-grotesk
  ```
- [ ] **Load at the app root** (`App.tsx`), gating first paint on the fonts:
  ```tsx
  import { useFonts, Newsreader_500Medium, Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';
  import { HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk';
  // const [fontsLoaded] = useFonts({ Newsreader_600SemiBold, ... }); render a splash/null until fontsLoaded.
  ```
- [ ] **Add a resolved-family helper** (native wants one registered face; web
  takes a CSS stack) — e.g. `src/lib/brandFont.ts`:
  ```ts
  import { Platform } from 'react-native';
  export const brandFont = {
    display: Platform.OS === 'web' ? 'Newsreader, Georgia, serif' : 'Newsreader_600SemiBold',
    body:    Platform.OS === 'web' ? '"Hanken Grotesk", system-ui, sans-serif' : 'HankenGrotesk_500Medium',
  };
  ```
- [ ] **Apply** `fontFamily: brandFont.display` to `PageHeader` titles and the
  display headings, `brandFont.body` to body text in the kit (`brandKit.tsx`)
  and migrated screens. One-line additions; no layout change.
- [ ] Gates: `npx tsc --noEmit && npx vitest run && npx eslint . --ext .ts,.tsx --quiet`.

> Note the exact `@expo-google-fonts` weight export names against the installed
> package versions before wiring — they occasionally differ by a suffix.

---

## B. App icon + web favicon — the Waypoint marker

`app.json` currently points at `./assets/icon.png` and `./assets/favicon.png`
(the old art). Regenerate from the marker below.

- [ ] **Save the marker source** as `waypoint-app/assets/brand/marker.svg`:
  ```svg
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" rx="224" fill="#F5F1E9"/>
    <path d="M512 214 C398 214 306 303 306 414 C306 566 512 810 512 810 C512 810 718 566 718 414 C718 303 626 214 512 214 Z" fill="#22303A"/>
    <circle cx="512" cy="398" r="92" fill="#0F766E"/>
  </svg>
  ```
  (For the transparent-background variant used by Android's adaptive
  foreground, drop the `<rect>` and export the pin+dot only.)
- [ ] **Rasterize** (any one of these, whatever the env has):
  ```bash
  # rsvg-convert
  rsvg-convert -w 1024 -h 1024 assets/brand/marker.svg -o assets/icon.png
  # or ImageMagick
  magick -background none -density 384 assets/brand/marker.svg -resize 1024x1024 assets/icon.png
  # favicon (paper bg is fine on web)
  magick assets/icon.png -resize 48x48 assets/favicon.png
  ```
  Also produce `assets/adaptive-icon.png` (1024, transparent bg, pin+dot only)
  if `android.adaptiveIcon.foregroundImage` is used.
- [ ] **Point `app.json`** at them (paths likely already correct — just confirm
  `icon`, `web.favicon`, and `android.adaptiveIcon.foregroundImage`).
- [ ] Rebuild web (`npm run build:web`) and confirm the tab favicon + PWA icon
  show the marker.

> The in-app mark (`<Brandmark>`) is separate and already done — it draws with
> Views and needs none of this. This is only the OS-level icon/favicon art.

---

## C. (Optional) react-native-svg — not required

The marker is Views-based and crisp; SVG is **not** needed. Only revisit if a
future mark needs true vector paths (e.g. a complex illustration). If so:
`npx expo install react-native-svg`, then a `<Brandmark>` SVG variant. Skip
otherwise — the dependency isn't worth carrying for a rounded-square pin.

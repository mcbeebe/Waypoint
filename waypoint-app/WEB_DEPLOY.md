# Waypoint — Web App Deployment

The same Expo / React Native codebase that powers the iOS & Android apps now
compiles to a real web app via `react-native-web`. No separate web codebase to
maintain — one source of truth for all three platforms.

## How it works

- `App.tsx` is the single entry point (the old stray `app/index.tsx` +
  `expo-router` plugin were removed to avoid an entry-point conflict).
- `app.json` → `expo.web` is configured with `bundler: metro`,
  `output: single` (SPA — correct for our React Navigation app).
- `src/components/WebFrame.tsx` wraps the app on web: on viewports wider than a
  phone it centers the mobile-first UI inside a fixed-width device column on a
  navy backdrop, so the screens read as an intentional app rather than a
  stretched full-bleed layout. On phones and native it's a pass-through.

## Build locally

```bash
cd waypoint-app
npm install
npm run build:web        # → produces ./dist (static site)
npx serve dist           # preview at http://localhost:3000
```

## Environment variables (required for auth / data / AI)

Set these at **build time** (Vercel project settings, or a local `.env`):

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Without them the app still renders the Welcome screen but auth/data calls fail.
The AI calls route through the Supabase `ai-proxy` Edge Function, so no AI keys
are ever exposed to the browser.

## Deploy — Vercel (recommended)

1. Import the GitHub repo into Vercel.
2. Set **Root Directory** to `waypoint-app`.
3. Vercel reads `vercel.json` automatically:
   - Build command: `npm run build:web`
   - Output directory: `dist`
   - SPA rewrite (all routes → `/index.html`)
4. Add the two `EXPO_PUBLIC_*` env vars in Project → Settings → Environment
   Variables.
5. Deploy. Add a custom domain (e.g. `app.waypoint...`) when ready.

## Alternative — GitHub Pages

A Pages workflow already exists for the standalone `docs/` MVP. To serve this
Expo build from a project Pages URL (`<user>.github.io/<repo>`), the bundle
needs a base path set via `experiments.baseUrl` because it uses absolute
`/_expo/...` asset paths. Ask and this can be wired into a GitHub Actions
workflow that builds `waypoint-app` and publishes `dist`.

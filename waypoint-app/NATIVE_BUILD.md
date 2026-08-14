# Waypoint — Native iOS Build & TestFlight

The same Expo codebase that powers the web/PWA also builds a real native iOS app
via **EAS Build** (Expo's cloud build service). You have an Apple Developer
account ready, so this is mostly filling in IDs and running two commands.

## Prerequisites

- Apple Developer Program membership (✅ ready).
- An Expo account (free) — sign up at https://expo.dev.
- EAS CLI: `npm install -g eas-cli` then `eas login`.

## One-time setup

```bash
cd waypoint-app
eas init           # creates the EAS project, writes the real projectId
```

`eas init` replaces the `YOUR_EAS_PROJECT_ID` placeholders in `app.json`
(`extra.eas.projectId` and `updates.url`) with your real project ID.

## Build for TestFlight

```bash
eas build --platform ios --profile production
```

EAS handles signing (it can create the distribution certificate and
provisioning profile for you when prompted). The result is an `.ipa` built in
the cloud — no Mac/Xcode required.

## Submit to TestFlight / App Store

```bash
eas submit --platform ios --profile production
```

This uploads the build to App Store Connect. Add it to a TestFlight group to
install on your iPhone via the TestFlight app.

## Values still needed (placeholders in config)

| File | Field | Where it comes from |
|------|-------|--------------------|
| `app.json` | `extra.eas.projectId` / `updates.url` | auto-filled by `eas init` |
| `eas.json` | `submit.production.ios.appleId` | your Apple ID email |
| `eas.json` | `submit.production.ios.appleTeamId` | Apple Developer → Membership → Team ID |
| `eas.json` | `submit.production.ios.ascAppId` | App Store Connect → your app → App Information → Apple ID (a numeric ID; created when you register the app in App Store Connect) |

`appleId` / `appleTeamId` / `ascAppId` are only required for `eas submit`. You
can run `eas build` first without them, then fill them in before submitting.

## Notes

- Bundle identifier is already set: `com.waypoint.app` (iOS) /
  `com.waypoint.app` (Android).
- Apple Sign-In, push notifications, secure store, and camera/photo
  permissions are already configured in `app.json`.
- The build profiles set an `APP_VARIANT` env var (development/preview/
  production) but `app.json` is static and doesn't read it yet. If you later
  want separate dev/preview bundle IDs installed side-by-side, convert
  `app.json` to a dynamic `app.config.js` that reads `process.env.APP_VARIANT`.

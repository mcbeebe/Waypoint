# Waypoint — Launch Checklist

Target: June 8, 2026 App Store Submission

## Pre-Build Setup

- [ ] Create EAS project: `eas init` → update `app.json` projectId
- [ ] Set up Apple Developer account ($99/year)
- [ ] Create App Store Connect listing
- [ ] Generate Apple Sign-In key (Services ID + Key)
- [ ] Set up Supabase production project
  - [ ] Run all migrations (001-004) against production
  - [ ] Enable RLS on all tables
  - [ ] Create `documents` storage bucket
  - [ ] Set environment variables

## API Keys & Secrets

- [ ] Anthropic API key (production) → Supabase Edge Function or secure proxy
- [ ] OpenAI API key (embeddings) → Supabase Edge Function
- [ ] Supabase URL + Anon Key → `.env` / EAS secrets
- [ ] **IMPORTANT**: Do NOT ship API keys in client bundle
  - [ ] Create Supabase Edge Functions for AI proxy
  - [ ] Create Supabase Edge Function for embedding generation

## Knowledge Base

- [ ] Run `scripts/ingest-kb.ts` against production Supabase
- [ ] Verify all 26 KB articles are embedded
- [ ] Test hybrid search returns relevant results

## Testing

- [ ] Test auth flow: sign up → onboarding → main app
- [ ] Test AI Navigator: send messages, verify streaming
- [ ] Test Action Plan: create, update status, toggle steps
- [ ] Test Calendar: create appointments, deadlines
- [ ] Test Document Vault: upload, view, filter
- [ ] Test i18n: switch to Spanish, switch to Vietnamese
- [ ] Test offline: enable airplane mode → verify banner + queue
- [ ] Test error boundary: force an error → verify recovery
- [ ] Test deep links: waypoint://
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 15 Pro Max (large screen)
- [ ] Test VoiceOver accessibility on all screens

## Build & Submit

- [ ] Run `eas build --platform ios --profile production`
- [ ] Test via TestFlight (internal)
- [ ] Test via TestFlight (external — 5 beta testers)
- [ ] Create App Store screenshots (6.7" and 6.5")
- [ ] Write App Store description (see APP_STORE_METADATA.md)
- [ ] Submit to App Store review
- [ ] Prepare support email / FAQ page
- [ ] Set up crash reporting (Sentry or similar)

## Post-Launch

- [ ] Monitor crash reports
- [ ] Monitor API usage / costs
- [ ] Set up analytics (anonymized)
- [ ] Plan Sprint 8: push notifications, document OCR, provider directory

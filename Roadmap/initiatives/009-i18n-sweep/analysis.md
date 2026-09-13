# 009 — Analysis: where Spanish actually stands

**Date:** 2026-09-13 · **Status:** adopted · **Method:** static audit of `waypoint-app` at `3699105`, plus `npx vitest run src/lib/localeParity.test.ts src/i18n/aiDisclosure.test.ts` (40 passed).

This corrects a first-pass reading of the same codebase that concluded "the chrome is English-only." That was wrong, and the way it was wrong matters: counting `t.*` usages measured **one** of three translation systems and missed the one the app actually uses.

## 1. Three translation systems, not one

| System | Where | Size | Enforced by | Health |
|---|---|---|---|---|
| String bundle | `src/i18n/{en,es,vi}.ts` | ~140 keys × 3 | `TranslationStrings` interface | **92% unused; partly stale** |
| Domain layer | 24 × `src/lib/*.ts` | 44 `es:` entries | `localeParity.test.ts` | **Healthy — system of record for content** |
| Inline tables | 19 screens/components | 114 entries | `Record<FunnelLocale, string>` | **The idiom that won** |

### The bundle is 92% unused
Only three files destructure `t`: `MainTabs.tsx`, `NavigatorScreen.tsx`, `ProfileScreen.tsx`. Together they consume **11 of ~140 keys**. The other 21 screens that call `useI18n()` take **`locale` only**, feeding it to the domain layer and their own inline tables.

### And partly stale
`home.actionPlan` ("Your Action Plan"), `home.quickActions`, `home.viewActions` match **no string rendered anywhere** in the app. HomeScreen was rebuilt (`Roadmap/Home-Rebuild-Plan.md`) and grew its own 42-entry inline table instead — including a second, independent copy of the greeting and the "Ask Waypoint Navigator" row.

**Implication:** "wire the unused bundle keys into the screens" is *not* free Spanish. Those screens already have Spanish; the bundle keys are partly obsolete duplicates.

## 2. Spanish quality is good, and it is real

- `es.ts` carries **140 keys**, all translated. Diffing every value against `en.ts` finds **6 identical** — `OK`, `No`, `Plan`, `Legal`, `IEP`, `IPP` — all legitimately identical in Spanish. **Zero untranslated leaks.**
- **Zero** `TODO` / `FIXME` / "pending translation" markers across `src/i18n/` and the domain modules.
- Register is consistent **usted**, idiomatic rather than literal: `¿Tiene algo en mente?`, `Su cuenta`, `No tienes que resolverlo todo hoy. Un paso a la vez.` Consistent with the ROADMAP rule that *"Spanish is human-reviewed, not machine passthrough."*
- `localeParity.test.ts` enforces that translation may change **prose only** — keys, statuses, legal citations, lever templates, action keys and progress percentages must be locale-invariant across en/es/vi. Verified passing.

## 3. Where Spanish actually stops

**Fourteen main screens render zero hardcoded English:** Home, Tools, ProcessMap, ResourceStack, SdpJourney, EligibilityResult, AskForSupports, EscalationLadder, FundedOffer, HowWaypointWorks, NotificationSettings, Plan, SupportDetail, Article.

**Eight are partially localized — ~95 strings (this initiative):**

| Screen | Residual EN strings |
|---|---|
| `ProfileScreen.tsx` | **42** |
| `ActionDetailScreen.tsx` | 15 |
| `ActionsScreen.tsx` | 14 |
| `NavigatorScreen.tsx` | 8 |
| `LettersScreen.tsx` | 7 |
| `EmailAnalyzerScreen.tsx` | 4 |
| `JourneyScreen.tsx` | 3 |
| `RequestCaseScreen.tsx` | 2 |

ProfileScreen is the sharpest failure: it **hosts the language picker**, and a parent who switches to Español to confirm the setting took effect reads `Family Info`, `Your first name`, `Save Changes`, `Delete account & all data` in English on that same screen.

**Twenty-nine screens have no i18n at all — ~314 parent-facing strings (out of scope here):** all of onboarding (`OnboardingFlow.tsx`, 723 lines — *"Welcome to Waypoint"*, *"Let's get to know your family"*, *"Child's Birthday"*), all auth, both legal screens, and Providers / Insurance / Services / Expenses / IEPHub / Calendar / Documents / Forum / Blog. A further ~47 sit on 8 staff screens, which arguably never need Spanish.

*(String counts are regex-derived and conservative — treat as a floor.)*

## 4. Beyond the screens

- **Working today:** Spanish push notifications (migration `051_push_token_locale.sql` + `_shared/replyPush.ts`, correct singular/plural, hand-written); Spanish AI letter drafts and email analysis (`ai-proxy` `DRAFT_LANG_NAMES`, passed from `LettersScreen` / `EmailAnalyzerScreen`).
- **Not working:** the **Navigator chat never sends a language param** — `streamNavigatorResponse` and `getNavigatorResponse` in `src/lib/ai.ts` omit it, so the chat may answer in English to a Spanish question. Drafts respect locale; the chat does not.
- **`lettersCatalog.ts`: 25 templates, zero Spanish.** English picker and English pre-filled request text producing a Spanish draft.
- **Unverified:** whether migration 051 is actually applied in production. Migrations are applied by hand; if it is not, trilingual push is silently dead. Cannot be checked from the repo.

## 5. Marketing site — people-bound, not code-bound

- Schema is ready: `locale: z.enum(['en','es'])` + `translationKey` "joins en/es siblings for hreflang."
- **All 40 content files are `locale: en`. Zero Spanish pages.**
- **`hreflang` is never rendered** — it appears only in schema comments, in no layout. A genuine code gap.
- The one Spanish letter is gated behind `esReady={false}`, showing an *"en revisión"* notice, pending a **credited bilingual reviewer** not yet engaged (`content-ops/reviewer/AGREEMENT-TERMS-ES.md` is explicitly *"NOT A CONTRACT"*).
- `content-ops/SCHEMA.md` counts **each ES page separately** against reviewer throughput, so site Spanish scales with hiring, not engineering.

## 6. Why Spanish is load-bearing

From `Roadmap/Market-Sizing-CA-Aug2026.md`:

- **~19% of Regional Center consumers are Spanish-primary** (~70k, 2021).
- **~58% of CA special ed is Hispanic/Latino**; ~40% of RC caseload.
- **Latino consumers receive ~$0.41 per $1.00** spent on White consumers; the state's $66M disparity-reduction spend judged *"largely ineffective"* (Public Counsel 2025).
- The doc's own conclusion: *"a free, **Spanish-capable** one is the only product shape that reaches it."*
- `Channel-Deep-Dive-Aug2026.md`: **SB 445** (Ch. 906/2024) creates IEP translation rights with no compliant CA incumbent.

Spanish is the market thesis, not a localization chore.

## 7. Contradiction to resolve

`ROADMAP.md` row 5 and §7.1 both state Vietnamese stays **"in repo but unlisted."** `ProfileScreen.tsx:74-78` ships `Tiếng Việt` 🇻🇳 as a selectable option. Both cannot be true. Either delist vi or update the ROADMAP — recorded as an open decision in `intent.md`.

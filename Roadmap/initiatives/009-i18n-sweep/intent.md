# 009 — i18n sweep: finish Spanish on the screens that already speak it

**Date:** 2026-09-13 (scope amended 2026-09-15; PR status corrected 2026-09-17) · **Status:** Open — **PRs 1 and 2 are merged to `main`.** PR 3 is re-landed and PR 4 open, both awaiting owner approval per the family-facing stop.

| PR | Scope | Status |
|----|-------|--------|
| 1 (#280) | ProfileScreen + DiagnosisSelector + ContactsCard | ✅ **Merged to `main`** 2026-09-13 |
| 2 (#282) | Device-language detection | ✅ **Merged to `main`** 2026-09-13 |
| 3 (#283) | WelcomeScreen | ⚠️ **Merged into a base that had already merged — never reached `main`.** Re-landed as **#295** |
| 4 | OnboardingFlow | Open, rebased onto current `main` |

**The stacking mistake, recorded so it is not repeated.** PR 3 was based on PR 2's branch rather than on `main`. PR 2 merged to `main` at `2026-09-13T23:52Z`; PR 3 then merged into that branch at `2026-09-14T04:55Z`, five hours after it had stopped feeding `main`. The merge succeeded and the code went nowhere — `welcomeCopy.ts` was absent from `main` for three days while the PR read as merged. The repo has hit this before (#288, "#287 merged into its stale base"). **Base an i18n PR on `main` unless it genuinely cannot compile there**, and when a stack is unavoidable, re-target the child the moment the parent merges.

**Where that leaves a family today:** `main` detects a Spanish phone and opens in Spanish, then shows an English Welcome and an English onboarding. Gate 7 needs #295 and PR 4.

**Artifacts:** intent.md (this) → analysis.md (the audit) → pr1-review-memo.md → PRs, one per screen cluster
**Serves:** `ROADMAP.md` Phase **7.1 — i18n sweep** ("English + Spanish. Move all screens onto the translation system") and **Gate 7** ("A Spanish-speaking parent uses the full app offline"). Locked decision row 5: *Languages — English + Spanish; vi kept in repo but unlisted.*

## Problem

Waypoint's Spanish is **much further along than any single file suggests, and stops in inconsistent places.** An audit (see `analysis.md`) found the app runs **three parallel translation systems**:

1. **`src/i18n/` bundle** (`en.ts`/`es.ts`/`vi.ts`, ~140 keys, `TranslationStrings`-enforced) — fully translated, **but only 11 keys are consumed**, and parts of its `home` section are **stale** (`Your Action Plan`, `Quick Actions`, `View Actions` no longer render anywhere).
2. **Domain layer** — 44 `es:` entries across **24 `src/lib/*.ts` modules**, parity-guarded by `localeParity.test.ts`. This is healthy and is the system of record for *content*.
3. **Inline `Record<FunnelLocale, string>` tables** in **19 screens/components** (114 entries) — the pattern the rebuilt screens actually adopted.

The consequence is not "the app is English." Fourteen main screens — Home, Tools, ProcessMap, ResourceStack, SdpJourney, EligibilityResult, AskForSupports, EscalationLadder, FundedOffer, HowWaypointWorks, NotificationSettings, Plan, SupportDetail, Article — render **zero hardcoded English**. The consequence is that Spanish **stops mid-app**: ~95 strings still render in English on eight screens that are otherwise localized, and **ProfileScreen — the screen that hosts the language picker — is the worst offender at 42.**

A parent who switches Waypoint to Español and lands on Ajustes to confirm it worked is met by `Family Info`, `Your first name`, `Save Changes`, `Delete account & all data`. That is where trust in the translation breaks.

## The one danger to design against

**Changing what the app *says* while claiming to change only what language it says it in.**

Every string here is family-facing copy. Under `CLAUDE.md` this sits behind the *"anything a family sees or that changes advice, tone, or legal framing"* stop, which the draft-flow auto-merge grant does **not** cover. Two specific failure modes:

1. **Tone drift in translation.** The escalation rule (collaborative → assertive → adversarial) and the status-not-blame framing are **locked**. A Spanish string must never firm up the tone its English twin uses — no `exigir` where the English asks. `localeParity.test.ts` guards the *content* modules; it does not see screen chrome, so chrome translations need their own care.
2. **Silent English fallback.** A missing locale must be a **compile error**, never a blank or an English leak. `Record<FunnelLocale, string>` gives that guarantee; a plain object or an `??  english` default does not. No `as` casts around locale maps.

Third, a process danger: **inventing a fourth system.** This initiative does not build new i18n machinery. It uses the pattern the surrounding code already uses.

## The shape (what we're building)

**Close the residual English on screens that already hold `locale`** — finish the job, screen by screen, in the idiom already there.

- **Pattern:** module-top `Record<FunnelLocale, string>` constants with a JSDoc line saying what the string is for, read via the `locale` the screen already pulls from `useI18n()`. Matches HomeScreen, the reference implementation.
- **Order, by parent impact:** ProfileScreen (42) → ActionsScreen (14) + ActionDetailScreen (15) → NavigatorScreen (8) + LettersScreen (7) → EmailAnalyzer (4), Journey (3), RequestCase (2).
- **Spanish is authored, not machine-passed.** `ROADMAP.md` §"Content design for stressed parents": *"Spanish is human-reviewed, not machine passthrough."* Usted-form throughout, matching the existing corpus (`Su cuenta`, `¿Tiene algo en mente?`).
- **Vietnamese travels with it.** `Record<FunnelLocale, …>` makes vi non-optional. The ROADMAP calls vi "unlisted", but `ProfileScreen.tsx` ships it as a selectable option — so vi strings are load-bearing today. See the open decision below.
- **Tests:** the `ui` vitest project renders each touched screen under `es` and asserts the English is gone. That suite exists precisely because the logic suite cannot see a rendered string.

**SCOPE AMENDED 2026-09-15.** This doc originally scoped the initiative to *"screens that already hold `locale`"* and listed onboarding and auth as explicitly out of scope. PRs 2–4 went outside that line, and an adversary pass was right to flag that the record had been silently invalidated. The reason the line moved, recorded honestly rather than retrofitted:

Finishing the partly-localized screens turned out not to deliver anything. `I18nProvider` defaulted to English and read only a stored preference that nothing writes before Settings — so a Spanish-speaking parent met the whole app in English on their first run regardless of how much of it was translated. The entry point (PR 2) and the two screens before the app proper (PRs 3–4) are what make any of the rest reachable. **Now in scope:** device-locale detection, `WelcomeScreen`, `OnboardingFlow`.

**Still explicitly out of scope** (later PRs or other initiatives): the remaining ~26 screens with no i18n (legal, Providers/Insurance/Services/Expenses/Calendar/Documents and the staff surfaces); the 25 English-only `lettersCatalog.ts` templates; passing `locale` into the Navigator chat in `ai.ts`; consolidating the three systems; the marketing site's zero Spanish pages (reviewer-bound, initiative 008).

**Known debt carried by these PRs, for the owner:**

- The legal screens (`TermsOfService`, `PrivacyPolicy`) are English-only, while PR 3's footer now promises in Spanish that the parent agrees to them. That is a **consent** question, not a copy one.
- `pick()` / `Tri` string tables are duplicated across four modules; a `Record<FunnelLocale, string>` shape (PR 4) catches a dropped locale at compile time but **not** a transposed es/vi pair — PR 4 adds an orthography guard for that, the others do not have one yet.
- Every string in all four PRs is a careful draft **pending native-speaker review**, per the house rule in `eligibility.ts`. No Spanish speaker has read any of it.

## Open decisions for the owner

1. **Vietnamese: unlisted or shipped?** `ROADMAP.md` row 5 and §7.1 both say vi stays *unlisted*, but `ProfileScreen.tsx:74-78` offers `Tiếng Việt` 🇻🇳 in the picker. Today a family can select the least-complete language. Either delist it or update the ROADMAP. **This initiative assumes shipped** and translates vi alongside es.
2. **Three systems → one?** The `src/i18n/` bundle is 92% unused and partly stale, while the inline pattern won in practice. Retiring or repopulating the bundle is a real decision; this initiative deliberately **does not** make it, and follows the majority idiom instead.

## Done when

- The eight partially-localized screens render **zero hardcoded user-visible English**; a Spanish-speaking parent can go signup-free from Home → Ask → Plan → Letters → Ajustes without meeting English chrome.
- Every new string is a `Record<FunnelLocale, string>` — a dropped locale fails `tsc`, not the parent.
- `ui`-project render tests prove each touched screen is English-free under `es`.
- All five gates green: `npx tsc --noEmit`, `npm run lint`, `npm test` (four projects), `npm run build:web`, and the `--dev` web export.
- Tone and advice **unchanged** — the diff moves language, never meaning. `/adversary` memo in each PR.
- ROADMAP 7.1 reflects reality, and the vi decision above is recorded either way.

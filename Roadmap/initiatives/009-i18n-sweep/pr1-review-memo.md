# 009 PR 1 — review memo (ProfileScreen i18n)

**Date:** 2026-09-13 · **Status:** awaiting owner approval · **Commits:** `adf29eb` (build) + `2fc4949` (adversary fixes)
**Branch:** `claude/waypoint-multi-language-status-1zu5nu`

Produced per the `CLAUDE.md` rule that family-facing copy runs `/adversary` first and waits for the owner. This lane is **not** covered by the draft-flow auto-merge grant.

## 1. What this change does

Translates the Profile/settings screen — the screen that hosts the language picker — into Spanish and Vietnamese, along with the two components it renders (`DiagnosisSelector`, `ContactsCard`). Before this, a parent who switched Waypoint to Español and opened Ajustes to confirm it worked was met by `Family Info`, `Your first name`, `Save Changes` and `Delete account & all data` in English, directly under a control that said Español.

## 2. Where to focus

1. **`src/lib/profileCopy.ts` — the Spanish and Vietnamese themselves.** ~140 strings including the two-step account-deletion confirmation and the AI-consent withdrawal copy. Nothing in CI can tell you a translation is *wrong*, only that it differs from English. **This is the part that needs a human, and specifically a Spanish-speaking one.**
2. **`ProfileScreen.tsx:710`** — the one functional bug in the change, found by the adversary and fixed. The `c` → `child` rename collided with the new `copy` object and produced `child.school_name || copy.grade`, always truthy. Worth confirming the fix reads right.
3. **`profileCopy.ts:644` / `contactsCopy.ts:31-39` / `DiagnosisSelector.tsx:38-60`** — the label/value split. Labels translate; `value` keys are persisted and read by `planGenerator`, `gapRules`, `homeTriage` and the letter writer. A translated value silently corrupts a child's plan. Verified invariant by the adversary against every consumer, and pinned by tests.
4. **`ProfileScreen.test.tsx:125-175`** — the whole-container sweep. This is the assertion the change actually rests on; the six-heading version it replaced missed four separate English blocks.

## 3. Adversarial findings

Thirteen findings from an independent subagent that had not seen the build. **Eleven fixed, two accepted with reasons.** None dropped.

| # | Finding | Response |
|---|---|---|
| 1 | `copy.grade` where `child.grade` was meant — always-truthy guard, empty text node in every child row without a school | **Fixed** `2fc4949`. Regression test asserts no empty leaf. |
| 2 | `guard(copy.multiChildFeature)` → "Apoyo para varios hijos **is a Premium feature**" (`gateCopy` is English-only) | **Fixed** — reverted to the English literal. Translating `gateCopy` is a separate surface. |
| 3 | Four English toasts on the auto-save path of the grids this PR translated; one of them the same sentence that *was* translated on the other route | **Fixed** — all four, plus `actionsClosedToast` pluralizing per language. |
| 4 | `DiagnosisSelector` rendered 23 English strings under "Diagnóstico" | **Fixed** — locale-aware; `value` keys unchanged. |
| 5 | `ContactsCard` rendered ~35 English strings under "Contactos clave", **and the test mocked it away** | **Fixed** — new `contactsCopy.ts`; the test now renders it for real. |
| 6 | `useEffect` depending on `copy` it never reads | **Fixed** — dependency removed. |
| 7 | Calendar-only Google copy says "Tap **Connect Google** above" — wrong button, wrong place — now in three languages, with a test pinning the error | **Fixed** — names "Add Gmail" below; test retargeted. |
| 8 | vi `egGrade` = "ví dụ: lớp 3" duplicates the word `gradeLabel` adds → "lớp lớp 3" | **Fixed** — placeholder is now "ví dụ: 3". |
| 9 | Translated fallbacks (`result.error ?? copy.tryAgain`) rarely render; the upstream English error wins | **Accepted.** Suppressing third-party error text costs real debuggability, and inventing translations for Supabase/Google failure strings is out of scope for a copy PR. **Owner should know:** a Spanish parent whose account deletion fails still reads an English technical message under a translated title. |
| 10 | Tests didn't bite: `changed.length > 0`, a mislabelled "unknown locale" test, six of twelve headings, no whole-container sweep, untested states | **Fixed** — sweep added; every label asserted; AI-consented and populated-contacts states covered; misleading test renamed to say what it actually pins. |
| 11 | Dead `childRemoved` key asserted as live | **Fixed** — removed. |
| 12 | `N/C` is not standard Spanish; `Các con` disagreed with `i18n/vi.ts`'s `Con cái` | **Fixed** — both. |
| 13 | Spanish `'Escriba el nombre'` dropped the softener its English and Vietnamese twins keep | **Fixed** — "Por favor escriba…". |

**The adversary also verified clean:** value invariance against every consumer (`gapRules`, `actionReconcile`, `planGenerator`, `homeTriage`, `HomeScreen`); no meaning drift in the AI-consent or account-deletion copy; no tone firming (no `exigir`/`demandar`/`yêu cầu`); `toFunnelLocale` behaving as assumed. It also noted the change **silently fixed a pre-existing stale-closure bug** in `handleAddChild` — `newChildDob` and `showToast` were missing from its deps on `main`, so typing a birthday and immediately tapping Add could persist a stale DOB.

**Mutation-tested, not just green:** reverting `DiagnosisSelector` to English fails the sweep with 20 leaked strings; reintroducing the `copy.grade` bug fails the empty-node test. Both restored after.

## 4. Assumptions and design decisions

- **Followed the inline `Record<FunnelLocale, …>` idiom rather than the `src/i18n/` bundle.** The bundle is 92% unused and partly stale; the inline pattern is what 19 screens actually use. **Consequence I accepted:** ProfileScreen is now half-and-half — it still reads `t.profile.title`/`language`/`signOut` from the bundle, which disagrees with `profileCopy` on casing (`Cerrar Sesión` vs `Cerrar sesión`). *The adversary is right that half-in guarantees divergence.* I left it because consolidating is the owner's architecture call (open decision #2), but it should not stay half-in for long.
- **`pick(locale, en, es, vi)` over three literal objects.** Terser and diffs as one string per line; the cost is that a wrong-slot argument (Spanish text in the Vietnamese position) type-checks. The whole-container sweep now catches that class in practice. A `Record<FunnelLocale, ProfileCopy>` of three literals would catch it at compile time — **a reasonable person would choose differently here**, and it is cheap to change later.
- **Vietnamese treated as shipped.** `ROADMAP.md` says vi is "unlisted"; the picker ships it. I translated vi throughout. **The real cost:** nobody on the team can eyeball the Vietnamese, and unlike Spanish there is no reviewer pipeline for it at all. *Open decision #1 — your call.*
- **Fidelity to the English, except where the English was provably wrong.** Finding 7 was a pre-existing dead end; mirroring it into two more languages would have tripled it, so I corrected it. Flagging because it means this PR changes one English string.
- **The rename was bundled into a copy PR.** It caused the only functional bug in the change and inflates a diff whose review value is line-by-line string comparison. The adversary is right; separate PRs would have been better.

## 5. What this PR does not do

The 29 screens with no i18n at all (**all of onboarding and auth** — the real Gate 7 blocker), the 25 English-only `lettersCatalog.ts` templates, the Navigator chat's missing `language` param, and the marketing site's zero Spanish pages (reviewer-bound, initiative 008).

## 6. What approval means

CI proves the strings differ from English and that the screen renders them. **It cannot prove the Spanish is good.** Approving this is a judgement that the translations are accurate and correctly registered — ideally checked by a Spanish speaker, which is also the reviewer role `content-ops/reviewer/AGREEMENT-TERMS-ES.md` was drafted for and which is still unfilled.

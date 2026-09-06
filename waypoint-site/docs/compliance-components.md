# Compliance components — spec

Four Astro components that carry the site's trust and safety copy. This document is
the source of truth for their **exact copy strings** and **placement rules**.

- **Location:** `src/components/compliance/` — one file per component.
- **Copy is contract.** Implement the strings below verbatim — no paraphrasing at
  build time. Changing a string requires editing this doc first (founder sign-off +
  reviewer, same as any published copy) and counts against the reviewer cadence cap.
  Spanish strings below are **drafts pending native-speaker review**; they ship only
  after that review, like all ES content.
- **No analytics.** The D3 taxonomy (`docs/analytics-taxonomy.md`) is frozen and
  defines no events for these components. They fire nothing. Never attach events here.
- **Static only.** Plain `.astro`, server-rendered, no client JS, no islands.
- **Never hidden.** Compliance copy is not placed inside accordions, tooltips,
  modals, or anything that requires interaction to read. (One narrow exception:
  the VerifiedAsOf *sources list* may collapse; its verified line may not.)
- **Accessibility.** Render as `<aside role="note">` with an `aria-label` naming the
  component's purpose; body text at normal size, minimum AA contrast in both themes.
- **Link target.** "Read our full disclaimer." links to the disclaimer legal page
  (`src/content/legal/disclaimer.mdx`; use the site's canonical legal route when wired).

---

## 1. NotLegalAdvice

**Purpose:** the inline "we are a guide, not your lawyer" block on every piece of
YMYL content.

**File:** `src/components/compliance/NotLegalAdvice.astro`

**Props**

```ts
interface Props {
  /** Mirrors D2 frontmatter `disclaimerVariant`. 'none' never reaches this component. */
  variant?: 'legal' | 'benefits' | 'medical'; // default 'legal'
  locale?: 'en' | 'es'; // default 'en'
}
```

**Exact copy — EN**

- `legal`:
  > Waypoint is a guide written by a parent, not a law firm. This page is general information about California rules — it is not legal advice, and reading it does not make Waypoint your lawyer. Laws change and every child's situation is different. Before a big decision, talk with a special education attorney or a trusted advocate. Read our full disclaimer.
- `benefits`:
  > Waypoint is a guide written by a parent, not a benefits agency or financial advisor. This page explains how programs generally work — it is not benefits or financial advice, and the numbers on it change over time. Check the "figures current as of" date, and confirm any dollar amount with the agency before you rely on it. Read our full disclaimer.
- `medical`:
  > Waypoint is a guide written by a parent, not a medical provider. This page is general information — it is not medical advice, and it is no substitute for your child's doctor or care team. Before making decisions about diagnosis, treatment, or therapy, talk with a clinician who knows your child. Read our full disclaimer.

**Exact copy — ES (draft, pending native-speaker review)**

- `legal`:
  > Waypoint es una guía escrita por un padre de familia, no un bufete de abogados. Esta página es información general sobre las reglas de California — no es asesoría legal, y leerla no convierte a Waypoint en su abogado. Las leyes cambian y la situación de cada niño es diferente. Antes de una decisión importante, hable con un abogado de educación especial o con un defensor de confianza. Lea nuestro aviso legal completo.
- `benefits`:
  > Waypoint es una guía escrita por un padre de familia, no una agencia de beneficios ni un asesor financiero. Esta página explica cómo funcionan los programas en general — no es asesoría de beneficios ni financiera, y las cifras cambian con el tiempo. Revise la fecha de "cifras vigentes al" y confirme cualquier cantidad con la agencia antes de confiar en ella. Lea nuestro aviso legal completo.
- `medical`:
  > Waypoint es una guía escrita por un padre de familia, no un proveedor médico. Esta página es información general — no es consejo médico y no sustituye al doctor ni al equipo de atención de su hijo. Antes de tomar decisiones sobre diagnóstico, tratamiento o terapia, hable con un profesional que conozca a su hijo. Lea nuestro aviso legal completo.

The final sentence ("Read our full disclaimer." / "Lea nuestro aviso legal completo.")
is a link to the disclaimer page.

**Placement rules**

- Rendered by the **article layout**, not authored per page — so it cannot be forgotten.
- Appears on **every guide, answer, and letter**, exactly once.
- Guides and answers: immediately **after the article body**, before the sources list.
- Letters: **before the letter template block** (above the copy button), so the
  reader meets it before copying.
- `variant` comes from the page's D2 `disclaimerVariant` frontmatter. When that field
  is `'none'`, the layout renders nothing — and `'none'` is allowed only on non-YMYL
  pages (enforced in review, not code).

---

## 2. CrisisNote

**Purpose:** a calm, supportive crisis-resources block on emotionally heavy topics.

**File:** `src/components/compliance/CrisisNote.astro`

**Props**

```ts
interface Props {
  locale?: 'en' | 'es'; // default 'en'
}
```

**Exact copy — EN**

> **You don't have to carry this alone.** If you are struggling, or you are worried about your child's safety or your own, call or text 988 to reach the Suicide & Crisis Lifeline — free, confidential, and open 24 hours a day. Para atención en español, llame al 988 y presione 2, o envíe la palabra AYUDA al 988. If someone is in immediate danger, call 911.

**Exact copy — ES (draft, pending native-speaker review)**

> **No tiene que cargar con esto a solas.** Si está pasando por un momento difícil, o le preocupa la seguridad de su hijo o la suya propia, llame o envíe un mensaje de texto al 988 para comunicarse con la Línea de Prevención del Suicidio y Crisis — gratuita, confidencial y disponible las 24 horas. Para atención en español, llame al 988 y presione 2, o envíe la palabra AYUDA al 988. Si alguien está en peligro inmediato, llame al 911.

**Trigger topics — the component MUST render on any page substantially about:**

- a new or recent diagnosis ("diagnosis day" content)
- regression or loss of skills
- self-injurious behavior, aggression, or elopement
- restraint or seclusion at school
- abuse, neglect, or bullying
- caregiver burnout, parent mental health, or family strain
- respite crisis, family separation, or out-of-home placement
- grief and loss
- denial-of-services content centered on a family in crisis

**Placement rules**

- Near the top: **after the intro paragraph, before the first H2**.
- Editors may **add** it to any page. **Removing** it from a trigger-topic page
  requires founder sign-off recorded in the page's changelog.
- Styling: calm and supportive (sage/teal family) — never red, never alarm iconography,
  never inside a collapsed element. 988 and 911 render as `tel:` links on mobile.

---

## 3. NotAffiliated

**Purpose:** the independence statement on entity pages, so no reader mistakes
Waypoint for the agency it describes.

**File:** `src/components/compliance/NotAffiliated.astro`

**Props**

```ts
interface Props {
  /** Display name of the entity, e.g. the D2 `rcName` value: "Golden Gate Regional Center". */
  entity: string;
  locale?: 'en' | 'es'; // default 'en'
}
```

**Exact copy — EN** (`{entity}` is the interpolated prop)

> Waypoint is an independent guide, not affiliated with or endorsed by {entity}, DDS, or any government agency.

**Exact copy — ES (draft, pending native-speaker review)**

> Waypoint es una guía independiente; no está afiliada ni respaldada por {entity}, el DDS ni ninguna agencia del gobierno.

**Placement rules**

- **Every regional-center page:** directly beneath the H1, before the intro. The D2
  `regionalCenters` schema pins `notAffiliated: true`, and the layout renders this
  component unconditionally for that collection.
- Any future entity page (school district, county office, agency profile): same
  position. The string keeps "DDS" as written even for non-DDS entities; changing
  that requires editing this spec first.
- Never collapsed, footnoted, or styled below body-text prominence.

---

## 4. VerifiedAsOf

**Purpose:** tells the reader when the contact details on a page were last
human-verified, and shows the sources.

**File:** `src/components/compliance/VerifiedAsOf.astro`

**Props**

```ts
interface Props {
  /** From D2 frontmatter `verifiedAsOf`. */
  verifiedDate: Date;
  /** From D2 frontmatter `sources`. */
  sources: { label: string; url: string; accessed: Date }[];
  locale?: 'en' | 'es'; // default 'en'
}
```

**Exact copy — EN** (`{date}` formatted long-form, e.g. "September 6, 2026")

> Contacts verified {date}

Stale variant — appended when `verifiedDate` is more than **120 days** old
(matching the D2 CI warn threshold; CI blocks edits past 180 days):

> Contacts verified {date} — this was checked a while ago; please confirm with the agency before relying on it.

**Exact copy — ES (draft, pending native-speaker review)** ("6 de septiembre de 2026")

> Datos de contacto verificados el {date}

Stale variant:

> Datos de contacto verificados el {date} — esta verificación no es reciente; confirme con la agencia antes de confiar en esta información.

**Rendering notes**

- Date formatting via `Intl.DateTimeFormat(locale, { dateStyle: 'long' })` at build.
- `sources` render beneath the line as a native `<details>` labeled **"Sources"**
  (ES: **"Fuentes"**), each entry a link with its `accessed` date. The sources list
  is the one compliance element allowed to collapse; the verified line itself never is.
- Staleness is computed **at build time**. A long-lived deploy can under-report age;
  the D2 freshness gate in CI is the real enforcement, and this component is the
  reader-facing echo of it.

**Placement rules**

- **Every regional-center page:** immediately adjacent to the intake phone / intake
  URL block, fed from that page's `verifiedAsOf` and `sources` frontmatter.
- Any other page that lists an agency phone number, address, or intake link.
- Never rendered without a real `verifiedDate` — no date, no contact block published.

---

## Placement matrix

| Content type | NotLegalAdvice | CrisisNote | NotAffiliated | VerifiedAsOf |
|---|---|---|---|---|
| Guides | Always (after body) | On trigger topics | — | If contacts listed |
| Answers | Always (after body) | On trigger topics | — | If contacts listed |
| Letters | Always (before template) | On trigger topics | — | — |
| Regional-center pages | Per `disclaimerVariant` | On trigger topics | Always (under H1) | Always (at contact block) |
| Research | Per `disclaimerVariant` | On trigger topics | — | — |
| Legal pages | — | — | — | — |

## Implementation checklist

- [ ] Four components in `src/components/compliance/`, strings verbatim from this doc
- [ ] Layout wiring: NotLegalAdvice + NotAffiliated driven by collection/frontmatter, not per-page MDX
- [ ] No Plausible calls anywhere in these components (D3 frozen)
- [ ] ES strings gated behind native-speaker review before any ES page ships
- [ ] Both themes checked for AA contrast; `role="note"` + `aria-label` on each

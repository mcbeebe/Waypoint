# gas-mvp ZIP routing — misroute report and patch

**Status:** open · **Found:** 2026-09-07, by the Regional Center verification pass
(43-agent workflow + statewide coverage audit) run for the marketing site
**Applies to:** `gas-mvp/Index.html`, `ZIP_TO_RC` (~line 786) and
`ZIP_5_OVERRIDES` (~line 808)
**Deploy:** this file is copy-paste deployed by hand, so nothing here reaches
users until you apply it.

## Why this matters

`lookupRC(zip)` is how a parent finds their Regional Center. A wrong answer does
not look like an error — it looks like an answer. The family calls, waits, and is
told they are in the wrong catchment, having lost the days or weeks that the
120-day eligibility clock was supposed to be running for.

## Confirmed misroutes, worst first

| # | Line | Current | Should be | Who is affected |
|---|---|---|---|---|
| 1 | `"921":"IRC"` | Inland RC (San Bernardino) | **SDRC** | **The city of San Diego.** 921xx is 92101–92199 — downtown, Hillcrest, Clairemont, La Jolla. The largest city in SDRC's catchment is routed two counties away. |
| 2 | `"908":"SGPRC"` | San Gabriel/Pomona | **HRC** | **Long Beach** (90801–90815). Harbor RC's own service area names Long Beach as one of its four DDS health districts. |
| 3 | `"907":"NLACRC"` | North LA County | **HRC** | Bellflower, Lakewood, Cerritos, Artesia, Hawaiian Gardens, Harbor City, San Pedro, Wilmington — all named in Harbor RC's catchment. |
| 4 | `"904":"NLACRC"` | North LA County | **WRC** | Santa Monica (90401–90405) and the Westside — Westside RC territory. NLACRC's own description explicitly disclaims the Westside. |
| 5 | `"955":"NBRC"` | North Bay (Napa) | **RCRC** | **All of Humboldt and Del Norte** — Eureka, Arcata, Fortuna, Crescent City. Note `RCRC` exists in `RC_DATABASE` (line 767) but appears **nowhere** in `ZIP_TO_RC`: Redwood Coast is currently unreachable by ZIP. |
| 6 | `"935":"TCRC"` | Tri-Counties (SLO/SB/Ventura) | *(remove)* | The Antelope Valley (Lancaster 93534, Palmdale 93550) belongs to NLACRC and East Kern to KRC. Neither is Tri-Counties. |
| 7 | `"922":"IRC"` | Inland RC | *(remove + overrides)* | **All of Imperial County** — El Centro, Calexico, Brawley (~180k residents). SDRC serves Imperial and runs an office in El Centro. The prefix also holds Riverside's Coachella Valley, which *is* Inland — so it straddles. |
| 8 | `"953":"VMRC"` | Valley Mountain | *(remove + overrides)* | Merced County (Merced, Atwater, Livingston) is Central Valley RC. The prefix also holds Stanislaus (Modesto), which *is* Valley Mountain. |
| 9 | `"954":"NBRC"` | North Bay | *(remove + overrides)* | Mendocino and Lake (Ukiah, Fort Bragg, Lakeport, Clearlake) are Redwood Coast. The prefix also holds Sonoma (Santa Rosa), which *is* North Bay. |

### The structural problem behind #1–#4

**Los Angeles County's seven catchments follow DDS health districts, not ZIP
prefixes.** Any 3-digit prefix rule over `900`–`918` is a guess, and the four
above are guesses that happen to be wrong. `waypoint-app` already concluded this
and deliberately omits every LA prefix, returning `null` so the UI asks the
family which area they are in.

**Recommendation: do the same here.** Delete the LA prefix rows entirely rather
than patching four of them. A picker prompt is a worse experience; a confident
wrong agency is a worse outcome.

## The patch

Replace the `ZIP_TO_RC` literal (~line 786) with:

```js
var ZIP_TO_RC = {
  // Prefixes that STRADDLE two catchments are deliberately absent: lookupRC
  // returns null and the UI falls back to the county/area picker. Absent:
  //   900-918  Los Angeles — 7 catchments follow DDS health districts.
  //   935      Kern / LA high desert.
  //   922      Riverside's Coachella Valley (IRC) + all of Imperial (SDRC).
  //   953      Merced (CVRC) + Stanislaus (VMRC).
  //   954      Sonoma (NBRC) + Mendocino and Lake (RCRC).
  "956":"ACRC","957":"ACRC","958":"ACRC","959":"ACRC",
  "944":"RCEB","945":"RCEB","946":"RCEB","947":"RCEB","948":"RCEB",
  "940":"GGRC","941":"GGRC","942":"GGRC","943":"GGRC","949":"GGRC",
  "955":"RCRC",                        // Humboldt + Del Norte (was NBRC)
  "960":"FNRC","961":"FNRC","962":"FNRC","963":"FNRC",
  "952":"VMRC",
  "936":"CVRC","937":"CVRC",
  "930":"TCRC","931":"TCRC","934":"TCRC",
  "932":"KRC","933":"KRC",
  "926":"RCOC","927":"RCOC","928":"RCOC",
  "919":"SDRC","920":"SDRC","921":"SDRC",   // 921 = city of San Diego (was IRC)
  "923":"IRC","924":"IRC","925":"IRC",
  "938":"SARC","939":"SARC","950":"SARC","951":"SARC",
};
```

Replace the `ZIP_5_OVERRIDES` literal inside `lookupRC` (~line 808) with:

```js
  var ZIP_5_OVERRIDES = {
    // Imperial County (SDRC) inside the mixed 922 prefix
    "92227":"SDRC","92231":"SDRC","92233":"SDRC","92243":"SDRC","92249":"SDRC",
    "92250":"SDRC","92251":"SDRC","92257":"SDRC","92273":"SDRC","92281":"SDRC",
    "92283":"SDRC",
    // Riverside's Coachella Valley (IRC) inside the same 922 prefix
    "92201":"IRC","92203":"IRC","92210":"IRC","92211":"IRC","92220":"IRC",
    "92223":"IRC","92225":"IRC","92234":"IRC","92236":"IRC","92240":"IRC",
    "92253":"IRC","92260":"IRC","92262":"IRC","92264":"IRC","92270":"IRC",
    "92276":"IRC",
    // Merced County (CVRC) inside the mixed 953 prefix
    "95301":"CVRC","95315":"CVRC","95322":"CVRC","95324":"CVRC","95333":"CVRC",
    "95334":"CVRC","95340":"CVRC","95341":"CVRC","95348":"CVRC","95388":"CVRC",
    // Stanislaus County (VMRC) inside the same 953 prefix
    "95307":"VMRC","95316":"VMRC","95326":"VMRC","95328":"VMRC","95350":"VMRC",
    "95351":"VMRC","95354":"VMRC","95355":"VMRC","95356":"VMRC","95358":"VMRC",
    "95361":"VMRC","95363":"VMRC","95367":"VMRC","95380":"VMRC","95382":"VMRC",
    "95386":"VMRC",
    // Mendocino + Lake (RCRC) inside the mixed 954 prefix
    "95422":"RCRC","95437":"RCRC","95451":"RCRC","95453":"RCRC","95454":"RCRC",
    "95457":"RCRC","95458":"RCRC","95460":"RCRC","95461":"RCRC","95470":"RCRC",
    "95482":"RCRC","95485":"RCRC","95490":"RCRC",
    // Sonoma County (NBRC) inside the same 954 prefix
    "95401":"NBRC","95403":"NBRC","95404":"NBRC","95405":"NBRC","95407":"NBRC",
    "95409":"NBRC","95425":"NBRC","95436":"NBRC","95439":"NBRC","95441":"NBRC",
    "95442":"NBRC","95446":"NBRC","95448":"NBRC","95452":"NBRC","95472":"NBRC",
    "95476":"NBRC","95492":"NBRC",
    // Antelope Valley (LA high desert) — North LA County RC
    "93534":"NLACRC","93535":"NLACRC","93536":"NLACRC","93543":"NLACRC",
    "93544":"NLACRC","93550":"NLACRC","93551":"NLACRC","93552":"NLACRC",
    "93553":"NLACRC","93591":"NLACRC",
    // East Kern — Kern RC (Ridgecrest office)
    "93501":"KRC","93505":"KRC","93516":"KRC","93518":"KRC","93519":"KRC",
    "93531":"KRC","93555":"KRC","93556":"KRC","93560":"KRC","93561":"KRC",
  };
```

The twelve entries dropped from the old override list (`93205/93225/93240/93252`
→ KRC, `93901/93905/93906/93907/93908` → SARC, `95020/95023/95024` → SARC) were
no-ops: their own 3-digit prefix already returned the same center. They read like
boundary fixes but changed nothing.

## What changes for users

- **Fixed:** San Diego city, Long Beach, Santa Monica/Westside, Humboldt, Del
  Norte, Imperial, Merced, Mendocino, Lake, and the Antelope Valley now resolve
  to the right center (or to the picker) instead of the wrong one.
- **Now asks instead of answering:** every Los Angeles County ZIP. This is
  intentional — see the structural note above.
- **Unchanged:** everywhere else.

## Verification before deploying

`waypoint-app` carries the same corrections with 11 regression tests
(`src/data/regionalCenters.test.ts`), all passing, which pin each fixed misroute
*and* its counterpart so fixing Imperial cannot break the Coachella Valley. That
suite is the closest thing to a test harness this table has — worth diffing the
two tables after any future edit to either.

## Not yet verified

ZIP-to-county assignments came from search-result snippets; the sandbox blocks
direct fetches to official domains. Boundary ZIPs that could not be confirmed
were deliberately left to the picker rather than guessed. Before deploying,
spot-check a handful against the DDS lookup at `dds.ca.gov/rc/lookup-rcs-by-county/`.

/**
 * California Regional Center directory, ZIP → RC mapping, and lookup helpers.
 *
 * Originally ported from the Apps Script MVP's ZIP_TO_RC / lookupRC. That
 * surface was retired and archived on 2026-09-07
 * (Archive/Retired-Surfaces/gas-mvp/Index.html) and its tables are known to be
 * WRONG — it routes the city of San Diego to Inland Regional Center and the
 * entire north coast to North Bay. THIS FILE is authoritative; never port a
 * value back from there or treat it as a second source.
 *
 * NOTE ON ACCURACY (added after the Aug 2026 content audit): this file contains
 * dated legal figures and statutory timelines. It is NOT frozen — when a law,
 * rate, or deadline changes, UPDATE IT, and verify edits against current
 * primary sources (DDS, SSA, CA Ed Code). Dollar amounts and ages are marked
 * with their year where possible. src/data/contentFacts.test.ts guards against
 * known-stale values reappearing.
 */
import type { RegionalCenter } from './types';

/** All 21 California Regional Centers. */
export const RC_DATABASE: RegionalCenter[] = [
  { code: 'ACRC', name: 'Alta California Regional Center', phone: '(916) 978-6400', website: 'altaregional.org', counties: ['Sacramento', 'Yolo', 'Yuba', 'Sutter', 'Nevada', 'Placer', 'Sierra', 'El Dorado', 'Alpine', 'Colusa'] },
  { code: 'RCEB', name: 'Regional Center of the East Bay', phone: '(510) 618-6100', website: 'rceb.org', counties: ['Alameda', 'Contra Costa'] },
  { code: 'GGRC', name: 'Golden Gate Regional Center', phone: '(415) 546-9222', website: 'ggrc.org', counties: ['San Francisco', 'San Mateo', 'Marin'] },
  { code: 'NBRC', name: 'North Bay Regional Center', phone: '(707) 256-1100', website: 'nbrc.net', counties: ['Napa', 'Solano', 'Sonoma'] },
  { code: 'RCRC', name: 'Redwood Coast Regional Center', phone: '(707) 445-0893', website: 'redwoodcoastrc.org', counties: ['Del Norte', 'Humboldt', 'Lake', 'Mendocino'] },
  { code: 'FNRC', name: 'Far Northern Regional Center', phone: '(530) 222-4791', website: 'farnorthernrc.org', counties: ['Butte', 'Glenn', 'Lassen', 'Modoc', 'Plumas', 'Shasta', 'Siskiyou', 'Tehama', 'Trinity'] },
  { code: 'VMRC', name: 'Valley Mountain Regional Center', phone: '(209) 473-0951', website: 'vmrc.net', counties: ['San Joaquin', 'Stanislaus', 'Amador', 'Calaveras', 'Tuolumne'] },
  { code: 'CVRC', name: 'Central Valley Regional Center', phone: '(559) 276-4300', website: 'cvrc.org', counties: ['Fresno', 'Kings', 'Madera', 'Mariposa', 'Merced', 'Tulare'] },
  { code: 'TCRC', name: 'Tri-Counties Regional Center', phone: '(805) 962-7881', website: 'tri-counties.org', counties: ['San Luis Obispo', 'Santa Barbara', 'Ventura'] },
  { code: 'KRC', name: 'Kern Regional Center', phone: '(661) 327-8531', website: 'kernrc.org', counties: ['Kern', 'Inyo', 'Mono'] },
  { code: 'SCLARC', name: 'South Central LA Regional Center', phone: '(213) 744-7000', website: 'sclarc.org', counties: ['Los Angeles (south central)'] },
  { code: 'ELARC', name: 'Eastern LA Regional Center', phone: '(626) 299-4700', website: 'elarc.org', counties: ['Los Angeles (east)'] },
  { code: 'NLACRC', name: 'North LA County Regional Center', phone: '(818) 778-1900', website: 'nlacrc.org', counties: ['Los Angeles (north)'] },
  { code: 'WRC', name: 'Westside Regional Center', phone: '(310) 258-4000', website: 'westsiderc.org', counties: ['Los Angeles (west)'] },
  { code: 'FRC', name: 'Frank D. Lanterman Regional Center', phone: '(213) 383-1300', website: 'lanterman.org', counties: ['Los Angeles (northeast)'] },
  { code: 'HRC', name: 'Harbor Regional Center', phone: '(310) 543-0100', website: 'harborrc.org', counties: ['Los Angeles (south bay)'] },
  { code: 'SGPRC', name: 'San Gabriel/Pomona Regional Center', phone: '(909) 620-7722', website: 'sgprc.org', counties: ['Los Angeles (San Gabriel Valley)'] },
  { code: 'IRC', name: 'Inland Regional Center', phone: '(909) 890-3000', website: 'inlandrc.org', counties: ['Riverside', 'San Bernardino'] },
  { code: 'SDRC', name: 'San Diego Regional Center', phone: '(858) 576-2996', website: 'sdrc.org', counties: ['San Diego', 'Imperial'] },
  { code: 'RCOC', name: 'Regional Center of Orange County', phone: '(714) 796-5100', website: 'rcocdd.com', counties: ['Orange'] },
  { code: 'SARC', name: 'San Andreas Regional Center', phone: '(408) 374-9960', website: 'sarc.org', counties: ['Santa Clara', 'San Benito', 'Santa Cruz', 'Monterey'] },
];

/** 3-digit ZIP prefix → Regional Center code. */
// NOTE: prefixes that STRADDLE two Regional Center catchments are deliberately
// ABSENT, because a prefix guess misroutes families — an absent prefix returns
// null from lookupRC and the UI falls back to the county/area picker, which is
// a worse experience but never a wrong answer. High-confidence city-level
// exceptions live in ZIP_5_OVERRIDES.
//
// Absent on purpose:
//   '900'-'918'  Los Angeles County — 7 catchments follow health districts.
//   '935'        Kern / LA high desert mix.
//   '922'        Riverside's Coachella Valley (IRC) + all of Imperial (SDRC).
//   '953'        Merced (CVRC) + Stanislaus (VMRC).
//   '954'        Sonoma (NBRC) + Mendocino and Lake (RCRC).
// The last three were REMOVED 2026-09-07: each had been mapped to one center,
// silently misrouting every family on the other side of the county line
// (Imperial -> Inland, Merced -> Valley Mountain, Ukiah/Lakeport -> North Bay).
export const ZIP_TO_RC: Record<string, string> = {
  '919': 'SDRC',
  '920': 'SDRC',
  '921': 'SDRC',
  '923': 'IRC',
  '924': 'IRC',
  '925': 'IRC',
  '926': 'RCOC',
  '927': 'RCOC',
  '928': 'RCOC',
  '930': 'TCRC',
  '931': 'TCRC',
  '932': 'KRC',
  '933': 'KRC',
  '934': 'TCRC',
  '936': 'CVRC',
  '937': 'CVRC',
  '938': 'SARC',
  '939': 'SARC',
  '940': 'GGRC',
  '941': 'GGRC',
  '942': 'GGRC',
  '943': 'GGRC',
  '944': 'RCEB',
  '945': 'RCEB',
  '946': 'RCEB',
  '947': 'RCEB',
  '948': 'RCEB',
  '949': 'GGRC',
  '950': 'SARC',
  '951': 'SARC',
  '952': 'VMRC',
  '955': 'RCRC', // Humboldt + Del Norte — both Redwood Coast counties
  '956': 'ACRC',
  '957': 'ACRC',
  '958': 'ACRC',
  '959': 'ACRC',
  '960': 'FNRC',
  '961': 'FNRC',
  '962': 'FNRC',
  '963': 'FNRC',
};

/**
 * 5-digit boundary-ZIP overrides, checked BEFORE the 3-digit prefix map.
 *
 * Every entry here must actually change the answer — an override whose own
 * prefix already yields the same center is dead weight that reads like a fix.
 * Twelve such no-ops were removed on 2026-09-07 (Kern 932xx and Salinas/Gilroy
 * 939xx/950xx entries that merely restated their prefix); a test now fails the
 * build if another is added.
 */
export const ZIP_5_OVERRIDES: Record<string, string> = {
  '95361': 'VMRC',
  '95363': 'VMRC',
  // Antelope Valley (LA County high desert) — North LA County RC
  '93534': 'NLACRC', '93535': 'NLACRC', '93536': 'NLACRC',
  '93543': 'NLACRC', '93544': 'NLACRC', '93550': 'NLACRC',
  '93551': 'NLACRC', '93552': 'NLACRC', '93553': 'NLACRC', '93591': 'NLACRC',
  // --- Imperial County (SDRC) inside the mixed '922' prefix ---
  // SDRC serves San Diego AND Imperial, and runs an Imperial Valley office in
  // El Centro. '922' previously sent all of these to Inland, ~180k residents.
  '92227': 'SDRC', '92231': 'SDRC', '92233': 'SDRC', '92243': 'SDRC',
  '92249': 'SDRC', '92250': 'SDRC', '92251': 'SDRC', '92257': 'SDRC',
  '92273': 'SDRC', '92281': 'SDRC', '92283': 'SDRC',
  // --- Riverside's Coachella Valley (IRC) inside the same '922' prefix ---
  '92201': 'IRC', '92203': 'IRC', '92210': 'IRC', '92211': 'IRC',
  '92220': 'IRC', '92223': 'IRC', '92225': 'IRC', '92234': 'IRC',
  '92236': 'IRC', '92240': 'IRC', '92253': 'IRC', '92260': 'IRC',
  '92262': 'IRC', '92264': 'IRC', '92270': 'IRC', '92276': 'IRC',
  // --- Merced County (CVRC) inside the mixed '953' prefix ---
  '95301': 'CVRC', '95315': 'CVRC', '95322': 'CVRC', '95324': 'CVRC',
  '95333': 'CVRC', '95334': 'CVRC', '95340': 'CVRC', '95341': 'CVRC',
  '95348': 'CVRC', '95388': 'CVRC',
  // --- Stanislaus County (VMRC) inside the same '953' prefix ---
  '95350': 'VMRC', '95351': 'VMRC', '95354': 'VMRC', '95355': 'VMRC',
  '95356': 'VMRC', '95358': 'VMRC', '95380': 'VMRC', '95382': 'VMRC',
  '95307': 'VMRC', '95316': 'VMRC', '95326': 'VMRC', '95328': 'VMRC',
  '95367': 'VMRC', '95386': 'VMRC',
  // --- Mendocino + Lake (RCRC) inside the mixed '954' prefix ---
  '95482': 'RCRC', '95437': 'RCRC', '95460': 'RCRC', '95490': 'RCRC',
  '95470': 'RCRC', '95454': 'RCRC', '95453': 'RCRC', '95422': 'RCRC',
  '95451': 'RCRC', '95457': 'RCRC', '95458': 'RCRC', '95461': 'RCRC',
  '95485': 'RCRC',
  // --- Sonoma County (NBRC) inside the same '954' prefix ---
  '95401': 'NBRC', '95403': 'NBRC', '95404': 'NBRC', '95405': 'NBRC',
  '95407': 'NBRC', '95409': 'NBRC', '95425': 'NBRC', '95436': 'NBRC',
  '95439': 'NBRC', '95441': 'NBRC', '95442': 'NBRC', '95446': 'NBRC',
  '95448': 'NBRC', '95452': 'NBRC', '95472': 'NBRC', '95476': 'NBRC',
  '95492': 'NBRC',
  // East Kern County — Kern RC (has a Ridgecrest office)
  '93501': 'KRC', '93505': 'KRC', '93516': 'KRC', '93518': 'KRC',
  '93519': 'KRC', '93531': 'KRC', '93555': 'KRC', '93556': 'KRC',
  '93560': 'KRC', '93561': 'KRC',
};

/** Find a Regional Center by its code (e.g. 'RCEB'). */
export function rcByCode(code: string): RegionalCenter | null {
  return RC_DATABASE.find((rc) => rc.code === code) ?? null;
}

/**
 * Match a ZIP code to its Regional Center.
 * Structure follows the archived GAS lookupRC: 5-digit boundary overrides first,
 * then the 3-digit prefix map. Returns null when no match.
 */
export function lookupRC(zip: string): RegionalCenter | null {
  if (!zip || zip.length < 3) return null;
  // Try full 5-digit match first for boundary ZIP codes
  if (zip.length >= 5) {
    const overrideCode = ZIP_5_OVERRIDES[zip.slice(0, 5)];
    if (overrideCode) {
      const rc = rcByCode(overrideCode);
      if (rc) return rc;
    }
  }
  const code = ZIP_TO_RC[zip.slice(0, 3)];
  if (code) return rcByCode(code);
  return null;
}

/** Every county across RC_DATABASE with its RC code, sorted A→Z (county fallback picker). */
export const ALL_COUNTIES: Array<{ county: string; rcCode: string }> = RC_DATABASE.flatMap((rc) =>
  rc.counties.map((county) => ({ county, rcCode: rc.code })),
).sort((a, b) => a.county.localeCompare(b.county));

/** Find a Regional Center by county name (case-insensitive). */
export function rcByCounty(county: string): RegionalCenter | null {
  const match = ALL_COUNTIES.find((c) => c.county.toLowerCase() === county.toLowerCase());
  return match ? rcByCode(match.rcCode) : null;
}

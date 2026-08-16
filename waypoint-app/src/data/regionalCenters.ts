/**
 * California Regional Center directory, ZIP → RC mapping, and lookup helpers.
 * Transcribed VERBATIM from gas-mvp/Index.html (RC_DATABASE ~lines 762-784,
 * ZIP_TO_RC ~lines 786-803, ZIP_5_OVERRIDES + lookupRC ~lines 805-821).
 * Content is authored domain knowledge — do not edit strings.
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
  { code: 'HRC', name: 'Harbor Regional Center', phone: '(310) 540-1711', website: 'harborrc.org', counties: ['Los Angeles (south bay)'] },
  { code: 'SGPRC', name: 'San Gabriel/Pomona Regional Center', phone: '(909) 620-7722', website: 'sgprc.org', counties: ['Los Angeles (San Gabriel Valley)'] },
  { code: 'IRC', name: 'Inland Regional Center', phone: '(909) 890-3000', website: 'inlandrc.org', counties: ['Riverside', 'San Bernardino'] },
  { code: 'SDRC', name: 'San Diego Regional Center', phone: '(858) 576-2996', website: 'sdrc.org', counties: ['San Diego', 'Imperial'] },
  { code: 'RCOC', name: 'Regional Center of Orange County', phone: '(714) 796-5100', website: 'rcocdd.com', counties: ['Orange'] },
  { code: 'SARC', name: 'San Andreas Regional Center', phone: '(408) 374-9960', website: 'sarc.org', counties: ['Santa Clara', 'San Benito', 'Santa Cruz', 'Monterey'] },
];

/** 3-digit ZIP prefix → Regional Center code. */
// NOTE: Los Angeles County prefixes ('900'-'918') and the Kern/LA-mixed '935'
// are deliberately ABSENT: LA's 7 Regional Center catchments follow health
// districts, not ZIP prefixes, so a prefix guess misroutes families. Those
// ZIPs return null from lookupRC and the UI falls back to the county/area
// picker. High-confidence city-level exceptions live in ZIP_5_OVERRIDES.
export const ZIP_TO_RC: Record<string, string> = {
  '919': 'SDRC',
  '920': 'SDRC',
  '921': 'SDRC',
  '922': 'IRC',
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
  '953': 'VMRC',
  '954': 'NBRC',
  '955': 'NBRC',
  '956': 'ACRC',
  '957': 'ACRC',
  '958': 'ACRC',
  '959': 'ACRC',
  '960': 'FNRC',
  '961': 'FNRC',
  '962': 'FNRC',
  '963': 'FNRC',
};

/** 5-digit boundary-ZIP overrides, checked before the 3-digit prefix map. */
export const ZIP_5_OVERRIDES: Record<string, string> = {
  '93205': 'KRC',
  '93225': 'KRC',
  '93240': 'KRC',
  '93252': 'KRC',
  '93901': 'SARC',
  '93905': 'SARC',
  '93906': 'SARC',
  '93907': 'SARC',
  '93908': 'SARC',
  '95020': 'SARC',
  '95023': 'SARC',
  '95024': 'SARC',
  '95361': 'VMRC',
  '95363': 'VMRC',
  // Antelope Valley (LA County high desert) — North LA County RC
  '93534': 'NLACRC', '93535': 'NLACRC', '93536': 'NLACRC',
  '93543': 'NLACRC', '93544': 'NLACRC', '93550': 'NLACRC',
  '93551': 'NLACRC', '93552': 'NLACRC', '93553': 'NLACRC', '93591': 'NLACRC',
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
 * Ported from the GAS lookupRC: 5-digit boundary overrides are checked first,
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

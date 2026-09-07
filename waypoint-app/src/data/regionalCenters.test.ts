/**
 * Regional Center routing fixtures (Wave 0.4) — every case here corresponds
 * to a real family being sent to the right (or deliberately un-guessed)
 * Regional Center. A wrong mapping here personalizes the Home screen, the
 * Agency Directory, and the AI system prompt with the WRONG agency.
 */

import { describe, it, expect } from 'vitest';
import {
  RC_DATABASE,
  ZIP_TO_RC,
  ZIP_5_OVERRIDES,
  lookupRC,
  rcByCode,
  rcByCounty,
  ALL_COUNTIES,
} from './regionalCenters';

describe('RC_DATABASE integrity', () => {
  it('contains all 21 California Regional Centers', () => {
    expect(RC_DATABASE).toHaveLength(21);
  });

  it('every RC has a code, name, and phone', () => {
    for (const rc of RC_DATABASE) {
      expect(rc.code).toBeTruthy();
      expect(rc.name).toMatch(/Regional Center/i);
      expect(rc.phone).toMatch(/\(\d{3}\)/);
    }
  });

  it('every ZIP prefix maps to a real RC code', () => {
    for (const [prefix, code] of Object.entries(ZIP_TO_RC)) {
      expect(rcByCode(code), `prefix ${prefix} -> ${code}`).not.toBeNull();
    }
  });

  it('covers all 58 California counties across the catchments', () => {
    // LA appears as 7 area-labeled entries; the plain-county total must
    // still span the state (58 counties; LA counted once via its 7 areas)
    const plainCounties = new Set(
      ALL_COUNTIES.map(c => c.county.replace(/\s*\(.*\)$/, ''))
    );
    expect(plainCounties.size).toBeGreaterThanOrEqual(58);
  });
});

describe('ZIP routing — regression fixtures', () => {
  it('routes San Diego city ZIPs to San Diego RC (not Inland)', () => {
    expect(lookupRC('92101')?.code).toBe('SDRC');
    expect(lookupRC('92115')?.code).toBe('SDRC');
  });

  it('routes Riverside/San Bernardino to Inland RC', () => {
    expect(lookupRC('92501')?.code).toBe('IRC');
    expect(lookupRC('92401')?.code).toBe('IRC');
  });

  it('refuses to guess Los Angeles County ZIPs (health-district catchments)', () => {
    expect(lookupRC('90210')).toBeNull(); // Beverly Hills — Westside RC area
    expect(lookupRC('90220')).toBeNull(); // Compton — different RC entirely
    expect(lookupRC('90802')).toBeNull(); // Long Beach — Harbor RC area
  });

  it('routes Antelope Valley (LA high desert) via 5-digit overrides', () => {
    expect(lookupRC('93534')?.code).toBe('NLACRC'); // Lancaster
    expect(lookupRC('93550')?.code).toBe('NLACRC'); // Palmdale
  });

  it('routes East Kern via 5-digit overrides (KRC has a Ridgecrest office)', () => {
    expect(lookupRC('93555')?.code).toBe('KRC'); // Ridgecrest
    expect(lookupRC('93501')?.code).toBe('KRC'); // Mojave
  });

  it('honors boundary-ZIP overrides before prefix rules', () => {
    expect(lookupRC('93901')?.code).toBe('SARC'); // Salinas — 939 prefix (comment previously misread this as 933)
    expect(lookupRC('95361')?.code).toBe('VMRC'); // Oakdale
  });

  // --- 2026-09-07: county-line misroutes found by the RC verification pass ---
  // Each of these prefixes had been mapped to a single center, silently sending
  // every family on the other side of the county line to the wrong agency.

  it('routes Imperial County to San Diego RC, not Inland (the 922 straddle)', () => {
    expect(lookupRC('92243')?.code).toBe('SDRC'); // El Centro — SDRC has an office here
    expect(lookupRC('92231')?.code).toBe('SDRC'); // Calexico
    expect(lookupRC('92227')?.code).toBe('SDRC'); // Brawley
  });

  it('still routes the Coachella Valley to Inland RC (the other half of 922)', () => {
    expect(lookupRC('92201')?.code).toBe('IRC'); // Indio
    expect(lookupRC('92262')?.code).toBe('IRC'); // Palm Springs
  });

  it('routes Merced County to Central Valley RC, not Valley Mountain (953)', () => {
    expect(lookupRC('95340')?.code).toBe('CVRC'); // Merced
    expect(lookupRC('95301')?.code).toBe('CVRC'); // Atwater
  });

  it('still routes Stanislaus to Valley Mountain (the other half of 953)', () => {
    expect(lookupRC('95350')?.code).toBe('VMRC'); // Modesto
    expect(lookupRC('95380')?.code).toBe('VMRC'); // Turlock
  });

  it('routes Humboldt and Del Norte to Redwood Coast, not North Bay (955)', () => {
    expect(lookupRC('95501')?.code).toBe('RCRC'); // Eureka
    expect(lookupRC('95521')?.code).toBe('RCRC'); // Arcata
    expect(lookupRC('95531')?.code).toBe('RCRC'); // Crescent City — Del Norte
  });

  it('routes Mendocino and Lake to Redwood Coast, not North Bay (the 954 straddle)', () => {
    expect(lookupRC('95482')?.code).toBe('RCRC'); // Ukiah
    expect(lookupRC('95437')?.code).toBe('RCRC'); // Fort Bragg
    expect(lookupRC('95453')?.code).toBe('RCRC'); // Lakeport — Lake County
  });

  it('still routes Sonoma to North Bay (the other half of 954)', () => {
    expect(lookupRC('95401')?.code).toBe('NBRC'); // Santa Rosa
    expect(lookupRC('95476')?.code).toBe('NBRC'); // Sonoma
  });

  it('falls back to the picker rather than guessing a straddling prefix', () => {
    // A ZIP inside a removed prefix with no override must return null — the UI
    // then asks for the county. Wrong-but-confident is the failure mode we are
    // buying our way out of here.
    expect(lookupRC('92259')).toBeNull(); // Ocotillo — Imperial, not overridden
    expect(lookupRC('95374')).toBeNull(); // Stevinson — Merced, not overridden
    expect(lookupRC('95412')).toBeNull(); // Annapolis — Sonoma, not overridden
  });

  it('every 5-digit override names a center that exists', () => {
    const codes = new Set(RC_DATABASE.map((rc) => rc.code));
    for (const [zip, code] of Object.entries(ZIP_5_OVERRIDES)) {
      expect(codes.has(code), `${zip} -> ${code}`).toBe(true);
      expect(zip).toMatch(/^\d{5}$/);
    }
  });

  it('no 5-digit override contradicts its own 3-digit prefix silently', () => {
    // An override whose prefix is still in ZIP_TO_RC and disagrees with it is a
    // deliberate boundary exception; one whose prefix is absent is part of a
    // straddle set. Either is fine — but the override must actually change the
    // answer, or it is dead weight pretending to be a fix.
    for (const [zip, code] of Object.entries(ZIP_5_OVERRIDES)) {
      const prefixCode = ZIP_TO_RC[zip.slice(0, 3)];
      if (prefixCode) expect(prefixCode).not.toBe(code);
    }
  });

  it('returns null for invalid or unknown ZIPs', () => {
    expect(lookupRC('')).toBeNull();
    expect(lookupRC('00000')).toBeNull();
    expect(lookupRC('10001')).toBeNull(); // New York
  });
});

describe('Phone numbers', () => {
  /**
   * Harbor RC shipped (310) 540-1711 until 2026-09-07 — a legacy line that
   * survives only because third-party directories scrape each other (Yelp,
   * ZoomInfo, LA County locator, 211LA). Searches scoped to harborrc.org and
   * dds.ca.gov return (310) 543-0100 as the main line, and the corroborating
   * fields have the current exchange too: fax 310-540-9538 is the old one,
   * while Early Start intake 310-543-0102 and the Torrance receptionist
   * 310-543-7993 share 543-xxxx. Pinned so a future "helpful" sync from an
   * aggregator cannot quietly put the dead number back.
   */
  it('ships Harbor RC the current main line, not the legacy 540-1711', () => {
    expect(rcByCode('HRC')?.phone).toBe('(310) 543-0100');
  });

  it('every center ships a plausibly-formatted 10-digit phone', () => {
    for (const rc of RC_DATABASE) {
      expect(rc.phone, rc.code).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
    }
  });
});

describe('County routing', () => {
  it('assigns Mariposa to Central Valley RC (not Valley Mountain)', () => {
    expect(rcByCounty('Mariposa')?.code).toBe('CVRC');
  });

  it('offers all 7 Los Angeles Regional Centers as distinct picker areas', () => {
    const laAreas = ALL_COUNTIES.filter(c => c.county.startsWith('Los Angeles'));
    expect(laAreas).toHaveLength(7);
    expect(new Set(laAreas.map(a => a.rcCode)).size).toBe(7);
  });

  it('routes Alameda to Regional Center of the East Bay', () => {
    expect(rcByCounty('Alameda')?.code).toBe('RCEB');
  });
});

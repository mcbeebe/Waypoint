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
    expect(lookupRC('93901')?.code).toBe('SARC'); // Salinas (933 prefix would say KRC)
    expect(lookupRC('95361')?.code).toBe('VMRC'); // Oakdale
  });

  it('returns null for invalid or unknown ZIPs', () => {
    expect(lookupRC('')).toBeNull();
    expect(lookupRC('00000')).toBeNull();
    expect(lookupRC('10001')).toBeNull(); // New York
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

/**
 * The Regional Center data spine (D11): the entity MDX frontmatter is the
 * single source; everything else — the finder tool, cross-links, any future
 * tables — derives from it at build time. The finder and the entity pages
 * can never disagree on county mapping because there is only one mapping.
 *
 * Coverage grows as entity pages land (21 total; Entity Matrix conversion is
 * a Phase 1 content-ops task). The finder states its current coverage
 * honestly rather than shipping an unverified hand-typed map.
 */
import { visibleEntries } from './content';

export interface RcRecord {
  rcId: string;
  rcName: string;
  counties: string[];
  url: string;
}

export interface CountyRoute {
  county: string;
  rcId: string;
  rcName: string;
  url: string;
}

/** All Regional Center entities visible in this build. */
export async function regionalCenterRecords(): Promise<RcRecord[]> {
  const entries = await visibleEntries('regionalCenters');
  return entries
    .map((e) => ({
      rcId: e.data.rcId,
      rcName: e.data.rcName,
      counties: e.data.counties,
      url: `/regional-centers/${e.data.rcId}/`,
    }))
    .sort((a, b) => a.rcName.localeCompare(b.rcName));
}

/** county → center routing derived from the spine, sorted by county. */
export async function countyRoutes(): Promise<CountyRoute[]> {
  const records = await regionalCenterRecords();
  const routes: CountyRoute[] = [];
  for (const rc of records) {
    for (const county of rc.counties) {
      routes.push({ county, rcId: rc.rcId, rcName: rc.rcName, url: rc.url });
    }
  }
  return routes.sort((a, b) => a.county.localeCompare(b.county));
}

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
import { getCollection } from 'astro:content';
import { isVisible } from './content';

export interface RcRecord {
  rcId: string;
  rcName: string;
  counties: string[];
  /** Main line, verified against the DDS listing. */
  phone: string | null;
  /** The center's own intake/apply page, when it has one. */
  intakeUrl: string | null;
  /** DDS listing — the primary source, and where we send people until our page publishes. */
  ddsListingUrl: string | null;
  verifiedAsOf: Date | null;
  /** Our own field guide — null until that page passes the review gate. */
  url: string | null;
}

export interface CountyRoute {
  county: string;
  rcId: string;
  rcName: string;
  phone: string | null;
  ddsListingUrl: string | null;
  intakeUrl: string | null;
  url: string | null;
}

/**
 * Every Regional Center entity in the repo — published or not.
 *
 * Routing deliberately does NOT wait on the review gate. Which center
 * serves your county, and its main phone number, are directory facts
 * verified against the DDS listing (recorded in each file's `sources[]`);
 * they are not the YMYL guidance the gate exists to hold back. Gating them
 * on an unwritten narrative section is what shipped a finder telling
 * families "0 of 21" while verified data sat in frontmatter.
 *
 * `url` is the one field that respects the gate: we link to our own field
 * guide only once it is published, and point at DDS until then.
 */
export async function regionalCenterRecords(): Promise<RcRecord[]> {
  const entries = await getCollection('regionalCenters');
  return entries
    .map((e) => ({
      rcId: e.data.rcId,
      rcName: e.data.rcName,
      counties: e.data.counties,
      phone: e.data.intakePhone,
      intakeUrl: e.data.intakeUrl,
      ddsListingUrl: e.data.ddsListingUrl,
      verifiedAsOf: e.data.verifiedAsOf,
      url: isVisible(e) ? `/regional-centers/${e.data.rcId}/` : null,
    }))
    .sort((a, b) => a.rcName.localeCompare(b.rcName));
}

/** county → center routing derived from the spine, sorted by county. */
export async function countyRoutes(): Promise<CountyRoute[]> {
  const records = await regionalCenterRecords();
  const routes: CountyRoute[] = [];
  for (const rc of records) {
    for (const county of rc.counties) {
      routes.push({
        county,
        rcId: rc.rcId,
        rcName: rc.rcName,
        phone: rc.phone,
        ddsListingUrl: rc.ddsListingUrl,
        intakeUrl: rc.intakeUrl,
        url: rc.url,
      });
    }
  }
  return routes.sort((a, b) => a.county.localeCompare(b.county));
}

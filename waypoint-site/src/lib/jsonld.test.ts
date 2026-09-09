/**
 * breadcrumbsJsonLd tests — GSC "Missing field item" regression
 * (/letters/iep-evaluation-request/, first detected 2026-09-08). Google
 * requires "item" on every ListItem except the last; these lock in that
 * any crumb short of the last one either carries a link or is dropped.
 */
import { describe, expect, it } from 'vitest';
import { breadcrumbsJsonLd, hubCrumb, type Crumb } from './jsonld';

describe('hubCrumb', () => {
  it('links when the hub URL exists in the build', () => {
    const urls = new Set(['/guides/regional-centers/']);
    expect(hubCrumb('Regional Centers', '/guides/regional-centers/', urls)).toEqual({
      name: 'Regional Centers',
      href: '/guides/regional-centers/',
    });
  });

  it('falls back to a plain label when the hub does not exist yet', () => {
    const urls = new Set(['/guides/benefits/']);
    expect(hubCrumb('Letters', '/letters/', urls)).toEqual({ name: 'Letters' });
  });
});

describe('breadcrumbsJsonLd', () => {
  it('carries @context/@type and links every non-last crumb that has an href', () => {
    const ld = breadcrumbsJsonLd([
      { name: 'Guides', href: '/guides/' },
      { name: 'Regional Centers', href: '/guides/regional-centers/' },
      { name: 'Appeal a denial' },
    ]);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Guides', item: 'https://waypointchild.com/guides/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Regional Centers',
        item: 'https://waypointchild.com/guides/regional-centers/',
      },
      { '@type': 'ListItem', position: 3, name: 'Appeal a denial' },
    ]);
  });

  it('omits item on the last crumb (the current page) without dropping it', () => {
    const ld = breadcrumbsJsonLd([{ name: 'Guides', href: '/guides/' }, { name: 'Current page' }]);
    const last = ld.itemListElement.at(-1)!;
    expect(last.name).toBe('Current page');
    expect(last).not.toHaveProperty('item');
  });

  it('drops a middle crumb with no href and renumbers positions sequentially', () => {
    // The exact shape that shipped on /letters/iep-evaluation-request/:
    // an unlinkable category label ("Letters") sitting between two real
    // crumbs used to ship position 2 with no "item".
    const crumbs: Crumb[] = [
      { name: 'Guides', href: '/guides/' },
      { name: 'Letters' },
      { name: 'IEP evaluation request' },
    ];
    const ld = breadcrumbsJsonLd(crumbs);
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Guides', item: 'https://waypointchild.com/guides/' },
      { '@type': 'ListItem', position: 2, name: 'IEP evaluation request' },
    ]);
  });

  it('drops an unlinkable first crumb the same way (not just middle ones)', () => {
    // The shape answers/[slug].astro shipped before its own fix: a
    // category label at position 1 with no href.
    const ld = breadcrumbsJsonLd([{ name: 'Answers' }, { name: 'Does my child need SSI for IHSS?' }]);
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Does my child need SSI for IHSS?' },
    ]);
  });

  it('drops every unlinkable crumb when more than one lacks an href', () => {
    const ld = breadcrumbsJsonLd([
      { name: 'Guides', href: '/guides/' },
      { name: 'Unlinked A' },
      { name: 'Unlinked B' },
      { name: 'Leaf' },
    ]);
    expect(ld.itemListElement.map((i) => i.name)).toEqual(['Guides', 'Leaf']);
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it('keeps a lone current-page crumb as a single valid ListItem', () => {
    const ld = breadcrumbsJsonLd([{ name: 'Home' }]);
    expect(ld.itemListElement).toEqual([{ '@type': 'ListItem', position: 1, name: 'Home' }]);
  });
});

/**
 * On web, React Navigation wrote every route param into the URL, so the text
 * of a letter, its subject, the parent's ask and the Navigator's guidance sat
 * in the address bar, in synced browser history, and in the page URL an error
 * report carries. These pin that none of it reaches an address any more —
 * through React Navigation's own path builder, not just a string helper.
 * (Invented names: this repository is public.)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPathFromState } from '@react-navigation/core';
import { withoutPrivateParams, stripQuery, PRIVATE_URL_PARAMS } from './urlPrivacy';

const LETTER = 'Dear Pat,\n\nMaya was diagnosed with autism in March. I am requesting an IPP review.';

describe('withoutPrivateParams', () => {
  it('drops every param that carries a family’s words, and keeps the keys and ids', () => {
    const path =
      '/letters?template=ipp_review_request' +
      `&draftBody=${encodeURIComponent(LETTER)}` +
      '&draftSubject=IPP%20review%20for%20Maya' +
      '&question=Ask+for+an+IPP+meeting' +
      '&guidance=She%20has%20sensory%20needs' +
      '&trackTitle=Need%20added%20to%20the%20IPP' +
      '&draftBodyUnlogged=true' +
      '&draftId=8f14e45f-ceea-467a-9575-0e5b2b6b0c1d&requestId=req-12&tone=warm';
    expect(withoutPrivateParams(path)).toBe(
      '/letters?template=ipp_review_request&draftId=8f14e45f-ceea-467a-9575-0e5b2b6b0c1d&requestId=req-12&tone=warm'
    );
  });

  it('drops free text under ANY name — a space, or longer than an id', () => {
    expect(withoutPrivateParams('/x?note=Maya%20has%20autism&id=a1')).toBe('/x?id=a1');
    expect(withoutPrivateParams('/x?note=Maya+has+autism')).toBe('/x');
    expect(withoutPrivateParams(`/x?blob=${'a'.repeat(81)}&view=actions`)).toBe('/x?view=actions');
  });

  it('leaves a path with nothing private exactly as it was', () => {
    for (const path of ['/letters', '/', '/plan?view=actions', '/supports-to-ask-for/sibling_support']) {
      expect(withoutPrivateParams(path)).toBe(path);
    }
  });

  it('survives malformed encoding without throwing', () => {
    expect(withoutPrivateParams('/x?draftBody=%E0%A4%A&id=1')).toBe('/x?id=1');
  });
});

describe('the path React Navigation actually builds', () => {
  const config = { screens: { Home: { screens: { Letters: 'letters' } } } };
  const state = {
    routes: [
      {
        name: 'Home',
        state: {
          routes: [
            {
              name: 'Letters',
              params: {
                template: 'general',
                draftBody: LETTER,
                draftSubject: 'IPP review for Maya',
                question: 'Ask for an IPP meeting',
                guidance: 'She has sensory needs',
                draftId: 'row-7',
              },
            },
          ],
        },
      },
    ],
  };

  it('carries the letter in the URL by default — which is the problem', () => {
    expect(getPathFromState(state as never, config as never)).toContain('draftBody=');
  });

  it('carries none of it once filtered', () => {
    const path = withoutPrivateParams(getPathFromState(state as never, config as never));
    expect(path).toBe('/letters?template=general&draftId=row-7');
    for (const key of PRIVATE_URL_PARAMS) expect(path).not.toContain(`${key}=`);
  });

  it('is the filter the app’s linking uses', () => {
    const app = readFileSync(join(__dirname, '../../App.tsx'), 'utf8');
    expect(app).toMatch(/getPathFromState: \(state, options\) => withoutPrivateParams\(getPathFromState\(state, options\)\)/);
  });
});

describe('stripQuery (what Sentry records)', () => {
  it('keeps the page, drops the query and fragment', () => {
    expect(stripQuery(`https://app.waypointchild.com/letters?draftBody=${encodeURIComponent(LETTER)}`)).toBe(
      'https://app.waypointchild.com/letters'
    );
    expect(stripQuery('/plan#top')).toBe('/plan');
    expect(stripQuery('/plan')).toBe('/plan');
  });

  it('is applied to Sentry’s navigation breadcrumbs and error URLs', () => {
    const src = readFileSync(join(__dirname, '../lib/sentry.ts'), 'utf8');
    expect(src).toMatch(/breadcrumb\.data\[key\] = stripQuery\(url\)/);
    expect(src).toMatch(/event\.request\.url = stripQuery\(event\.request\.url\)/);
  });
});

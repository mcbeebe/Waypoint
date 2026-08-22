import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WEB_ORIGIN,
  LINK_LABEL,
  isPublicOrigin,
  actionUrl,
  calendarUrl,
  waypointLinkBlock,
  stripWaypointLink,
  withWaypointLink,
} from './appLinks';

describe('isPublicOrigin', () => {
  it('accepts a real https origin', () => {
    expect(isPublicOrigin('https://waypointchild.com')).toBe(true);
  });

  it('rejects localhost — the link has to work from someone else’s device', () => {
    expect(isPublicOrigin('http://localhost:8081')).toBe(false);
    expect(isPublicOrigin('http://127.0.0.1:19006')).toBe(false);
  });

  it('rejects empty and non-http values', () => {
    expect(isPublicOrigin('')).toBe(false);
    expect(isPublicOrigin(undefined)).toBe(false);
    expect(isPublicOrigin('waypoint://actions')).toBe(false);
  });
});

describe('actionUrl', () => {
  it('matches the actions/:actionId route', () => {
    expect(actionUrl('abc-123', 'https://waypointchild.com')).toBe(
      'https://waypointchild.com/actions/abc-123'
    );
  });

  it('tolerates a trailing slash on the origin', () => {
    expect(actionUrl('abc', 'https://example.com/')).toBe('https://example.com/actions/abc');
  });

  it('defaults to the production origin', () => {
    expect(actionUrl('abc').startsWith(DEFAULT_WEB_ORIGIN)).toBe(true);
  });

  it('escapes anything odd in the id', () => {
    expect(actionUrl('a b', 'https://x.com')).toBe('https://x.com/actions/a%20b');
  });
});

describe('calendarUrl', () => {
  it('points at the calendar route', () => {
    expect(calendarUrl('https://x.com')).toBe('https://x.com/calendar');
  });
});

describe('withWaypointLink', () => {
  const url = 'https://waypointchild.com/actions/abc';

  it('appends the link below the existing notes', () => {
    const out = withWaypointLink('Bring the IEP packet.', url);
    expect(out).toBe(`Bring the IEP packet.\n\n${LINK_LABEL} ${url}`);
  });

  it('returns just the link when there are no notes', () => {
    expect(withWaypointLink('', url)).toBe(waypointLinkBlock(url));
  });

  it('is idempotent — re-saving does not stack duplicate links', () => {
    const once = withWaypointLink('Call the SC.', url);
    expect(withWaypointLink(once, url)).toBe(once);
    expect(withWaypointLink(withWaypointLink(once, url), url)).toBe(once);
  });

  it('replaces a stale link rather than adding a second one', () => {
    const stale = withWaypointLink('Notes', 'https://waypointchild.com/actions/old');
    const fresh = withWaypointLink(stale, url);
    expect(fresh).toBe(`Notes\n\n${LINK_LABEL} ${url}`);
    expect(fresh.split(LINK_LABEL).length - 1).toBe(1);
  });

  it('preserves the parent’s own text verbatim', () => {
    const body = 'Line one\n\nLine two\n  indented detail';
    expect(withWaypointLink(body, url).startsWith(body)).toBe(true);
  });
});

describe('stripWaypointLink', () => {
  it('leaves untouched notes alone', () => {
    expect(stripWaypointLink('Just notes.')).toBe('Just notes.');
  });

  it('removes the link line and collapses the blank gap', () => {
    expect(stripWaypointLink(`Notes\n\n${LINK_LABEL} https://x.com/actions/a`)).toBe('Notes');
  });
});

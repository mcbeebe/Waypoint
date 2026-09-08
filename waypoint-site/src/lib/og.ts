/**
 * Open Graph card rendering (satori → SVG → resvg → PNG), at build time.
 *
 * Every share of a Waypoint page — the exact moment a parent forwards a
 * guide to another parent — used to render as a bare text card. These
 * cards carry the brand tokens and the page's own title so a forwarded
 * link looks like something worth opening.
 *
 * Build-time only: no runtime image service, no per-transform metering.
 * Fonts are the TTFs in src/assets/fonts (satori cannot read woff2, which
 * is why those live alongside the woff2 files the site itself serves).
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Resolved from the project root, not from import.meta.url: at build time
// this module is bundled into dist/.prerender/, where a module-relative
// path no longer points at src/assets (it failed exactly that way once).
const FONTS = path.resolve(process.cwd(), 'src', 'assets', 'fonts');

const display = readFileSync(path.join(FONTS, 'Newsreader-SemiBold.ttf'));
const body = readFileSync(path.join(FONTS, 'HankenGrotesk-Bold.ttf'));

/** initiative-006 brand tokens (see src/styles/global.css). */
const INK = '#22303A';
const PINE = '#0F766E';
const SAGE = '#0E9E6E';
const PAPER = '#F5F1E9';
const INK_SOFT = '#55606B';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** The Brandmark: ink pin, pine centre, sage route to the next point. */
function brandmark() {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'center', gap: 14 },
      children: [
        {
          type: 'svg',
          props: {
            width: 62,
            height: 48,
            viewBox: '0 0 62 48',
            children: [
              { type: 'rect', props: { x: 24, y: 35.4, width: 26, height: 4.4, rx: 2.2, fill: SAGE } },
              { type: 'circle', props: { cx: 54, cy: 37.6, r: 5.6, fill: SAGE } },
              {
                type: 'path',
                props: {
                  d: 'M22 44 C 22 44 6 28.2 6 18.2 C 6 9.25 13.16 2 22 2 C 30.84 2 38 9.25 38 18.2 C 38 28.2 22 44 22 44 Z',
                  fill: INK,
                },
              },
              { type: 'circle', props: { cx: 22, cy: 17.6, r: 6.3, fill: PINE } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'Hanken Grotesk',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: INK,
            },
            children: 'WAYPOINT',
          },
        },
      ],
    },
  };
}

export interface OgCard {
  title: string;
  /** Small uppercase label above the title — the pillar or section. */
  eyebrow?: string;
}

/** Render one card to PNG bytes. */
export async function renderOg({ title, eyebrow }: OgCard): Promise<Uint8Array> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: OG_WIDTH,
          height: OG_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          padding: '64px 72px',
          // The sage route line, echoed as the card's bottom edge.
          borderBottom: `16px solid ${PINE}`,
        },
        children: [
          brandmark(),
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: 18 },
              children: [
                ...(eyebrow
                  ? [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontFamily: 'Hanken Grotesk',
                            fontSize: 24,
                            fontWeight: 700,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: PINE,
                          },
                          children: eyebrow,
                        },
                      },
                    ]
                  : []),
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Newsreader',
                      fontSize: title.length > 70 ? 58 : 68,
                      lineHeight: 1.15,
                      color: INK,
                      // satori has no text-wrap:balance; the width cap does the work.
                      maxWidth: 980,
                    },
                    children: title,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontFamily: 'Hanken Grotesk',
                fontSize: 24,
                fontWeight: 700,
                color: INK_SOFT,
              },
              children: 'waypointchild.com · free guides for California families',
            },
          },
        ],
      },
    },
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [
        { name: 'Newsreader', data: display, weight: 600, style: 'normal' },
        { name: 'Hanken Grotesk', data: body, weight: 700, style: 'normal' },
      ],
    },
  );

  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}

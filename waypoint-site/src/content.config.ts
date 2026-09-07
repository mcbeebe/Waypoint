/**
 * The content schema contract (Decision D2 in the build plan).
 *
 * This file IS the enforcement mechanism for the site's SEO and trust
 * contract: a page missing its description, translationKey, or review
 * metadata fails `astro build`. Content-ops owns the field semantics
 * (documented in content-ops/SCHEMA.md); engineering owns the wiring.
 *
 * Status ladder: draft → founder_edit → in_review → approved → published.
 * Nothing YMYL renders publicly unless status === 'published', and
 * status can only reach 'published' with a completed review block —
 * enforced by the refine below, not by convention.
 */
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

export const PILLARS = [
  'regional-centers',
  'iep',
  'benefits',
  'insurance',
  'first-steps',
  'start',
] as const;

export const RC_IDS = [
  'alta-california',
  'central-valley',
  'east-bay',
  'eastern-la',
  'far-northern',
  'golden-gate',
  'harbor',
  'inland',
  'kern',
  'lanterman',
  'north-bay',
  'north-la',
  'orange-county',
  'redwood-coast',
  'san-andreas',
  'san-diego',
  'san-gabriel-pomona',
  'south-central-la',
  'tri-counties',
  'valley-mountain',
  'westside',
] as const;

const REFRESH_EVENTS = [
  'ssa-cola-oct',
  'ssi-fbr-jan',
  'ihss-wages-jan',
  'may-revise',
  'june-budget',
  'rc-pos-annual',
  'annual',
  'none',
] as const;

const review = z
  .object({
    reviewedBy: z.string(),
    credential: z.string(),
    date: z.coerce.date(),
    /** git SHA of the draft the reviewer signed off on */
    versionReviewed: z.string(),
  })
  .nullable()
  .default(null);

const seoBase = z.object({
  title: z.string().max(70),
  description: z.string().min(40).max(160),
  locale: z.enum(['en', 'es']).default('en'),
  /** Joins en/es siblings for hreflang — set even before the twin exists. */
  translationKey: z.string(),
  status: z
    .enum(['draft', 'founder_edit', 'in_review', 'approved', 'published'])
    .default('draft'),
  author: z.string().default('Mike Beebe'),
  review,
  datePublished: z.coerce.date().nullable().default(null),
  dateModified: z.coerce.date(),
  /** Which named calendar event triggers this page's refresh. */
  nextReviewEvent: z.enum(REFRESH_EVENTS).default('annual'),
  sources: z
    .array(z.object({ label: z.string(), url: z.string().url(), accessed: z.coerce.date() }))
    .default([]),
  /** Maintenance record, NOT rendered on the page (owner decision 2026-09-07 —
   *  the on-page block was noise for parents). Kept in frontmatter and git so
   *  every content change stays auditable; the pipeline still requires an entry
   *  per edit (CONTENT-PIPELINE.md). Write it for the next maintainer. */
  changelog: z.array(z.object({ date: z.coerce.date(), note: z.string() })).default([]),
  disclaimerVariant: z.enum(['legal', 'benefits', 'medical', 'none']).default('legal'),
  noindex: z.boolean().default(false),
});

/**
 * Published YMYL pages must carry a completed review block AND a real
 * datePublished — Article JSON-LD must never have to invent one.
 */
const requireReviewWhenPublished = (data: {
  status: string;
  review: unknown;
  datePublished: unknown;
}) => data.status !== 'published' || (data.review !== null && data.datePublished !== null);
const REVIEW_MSG = {
  message:
    "status 'published' requires a completed review block and datePublished (D2 / trust contract)",
  path: ['review'],
};

const guides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guides' }),
  schema: seoBase
    .extend({ pillar: z.enum(PILLARS) })
    .refine(requireReviewWhenPublished, REVIEW_MSG),
});

const answers = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/answers' }),
  schema: seoBase
    .extend({
      pillar: z.enum(PILLARS),
      /** Provenance of the question: how it entered the queue. */
      questionSource: z.enum(['chat-mined', 'gsc', 'paa', 'kb', 'editorial']).default('editorial'),
    })
    .refine(requireReviewWhenPublished, REVIEW_MSG),
});

const letters = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/letters' }),
  schema: seoBase
    .extend({
      pillar: z.enum(PILLARS),
      letterId: z.string(),
    })
    .refine(requireReviewWhenPublished, REVIEW_MSG),
});

const regionalCenters = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/regional-centers' }),
  schema: seoBase
    .extend({
      rcId: z.enum(RC_IDS),
      rcName: z.string(),
      counties: z.array(z.string()).min(1),
      intakePhone: z.string().nullable().default(null),
      intakeUrl: z.string().url().nullable().default(null),
      ddsListingUrl: z.string().url().nullable().default(null),
      /**
       * When the contact data was last ACTUALLY verified; CI warns >120d,
       * blocks edits >180d. `null` means never verified — the honest state
       * for a stub whose county list is still an authored guess.
       *
       * It was non-nullable until 2026-09-07, which meant an unverified stub
       * had to carry some date anyway: all 21 were generated with the same
       * 2026-09-06, and four turned out never to have been checked against
       * any source. A required date field manufactured twenty-one
       * verification claims. Publishing with null is still refused below,
       * so nothing unverified can reach a family.
       */
      verifiedAsOf: z.coerce.date().nullable().default(null),
      notAffiliated: z.literal(true).default(true),
    })
    .refine(requireReviewWhenPublished, REVIEW_MSG)
    .refine((data) => data.status !== 'published' || data.verifiedAsOf !== null, {
      message:
        "status 'published' requires a real verifiedAsOf date — an unverified Regional Center page must not ship (D11)",
      path: ['verifiedAsOf'],
    }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/research' }),
  schema: seoBase
    .extend({
      datasetUrl: z.string().nullable().default(null),
      methodologyKey: z.string().nullable().default(null),
    })
    .refine(requireReviewWhenPublished, REVIEW_MSG),
});

/** Legal pages: counsel-reviewed copy; lighter schema, same freshness discipline. */
const legal = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/legal' }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().min(40).max(160),
    locale: z.enum(['en', 'es']).default('en'),
    translationKey: z.string(),
    dateModified: z.coerce.date(),
    lastLegalReview: z.coerce.date().nullable().default(null),
    reviewedBy: z.string().nullable().default(null),
  }),
});

export const collections = { guides, answers, letters, regionalCenters, research, legal };

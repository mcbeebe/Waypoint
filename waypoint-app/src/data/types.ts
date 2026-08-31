/**
 * Shared types for the California navigation data layer (roadmap Phase 1).
 * The data itself is transcribed from the GAS MVP (gas-mvp/Index.html) and
 * root prototypes — content is authored domain knowledge, keep it verbatim.
 */

export interface RegionalCenter {
  /** Short code, e.g. 'rceb' */
  code: string;
  name: string;
  phone: string;
  website: string;
  counties: string[];
}

export interface Agency {
  key: string;
  name: string;
  /** 'State' | 'Federal' | 'County' | 'Private' etc. */
  type: string;
  phone: string;
  website: string;
  /** Plain-English definition */
  what: string;
  whyMatters: string;
  services: string[];
  /** Statute-cited rights */
  rights: string[];
  /** The pitfall to avoid */
  watchOut: string;
  /** True when the entry should be overwritten with the user's actual RC */
  dynamic?: boolean;
}

export interface LearnMoreEntry {
  key: string;
  title: string;
  /** Multi-paragraph plain text (paragraphs separated by \n\n) */
  body: string;
  /** One actionable tip */
  tip: string;
}

export interface Reimbursable {
  name: string;
  /** POS billing code(s), e.g. '862/864' */
  code: string;
  description: string;
  /** Typical cost range */
  cost: string;
  /** Insider note */
  note: string;
  /**
   * A few plain-language bullets — the digestible "what this really means and
   * how to ask" that doesn't fit the one-line description. Shown in the card's
   * "More info" dropdown (owner, Aug 31 2026).
   */
  moreInfo?: string[];
  /**
   * The Learn article this service links to for the full guide. Defaults to the
   * RC-funding overview (`rc_money`) until a dedicated article is written.
   */
  articleKey?: string;
}

export interface JourneyEntity {
  name: string;
  action: string;
  time: string;
}

export interface JourneyPhase {
  /** Age range label, e.g. '0–3', '14–17', '18+' */
  age: string;
  label: string;
  color: string;
  bg: string;
  icon: string;
  description: string;
  entities: JourneyEntity[];
  milestone: string;
  alert: string;
}

export interface Journey {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  intro: string;
  phases: JourneyPhase[];
}

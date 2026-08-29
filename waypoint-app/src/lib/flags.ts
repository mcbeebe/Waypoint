/**
 * Feature flags — compile-time switches for features that are built but not
 * yet ready for users. Flip to true (or replace with a remote-config lookup)
 * when the feature's hardening workstream completes.
 */
export const FLAGS = {
  /**
   * Peer community (forum, threads, direct messages).
   * Off until moderation tooling ships (roadmap 6.1) — an unmoderated forum
   * for a vulnerable population is a safety risk, per the locked plan decision.
   */
  community: false,
  /**
   * Premium paywall enforcement (owner decision, Aug 2026: off while the
   * owner dogfoods — everyone resolves as Premium). Flip to true at launch,
   * together with PAYWALL_ENFORCED in supabase/functions/ai-proxy/index.ts
   * (the server-side twin that gates AI actions and the monthly cap).
   */
  paywall: false,
  /**
   * The rebuilt Home (Roadmap/Home-Rebuild-Plan.md): the One Thing card, the
   * sensor line, and the Later list in place of the stack of competing cards.
   * Default ON while the owner dogfoods. Turning it off hides the new block;
   * it does not restore the cards phase 2 deleted — reverting the commit is
   * the real fallback, and this is the kill switch for a bad live pick.
   */
  newHome: true,
} as const;

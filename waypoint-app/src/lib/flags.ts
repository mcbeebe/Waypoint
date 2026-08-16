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
} as const;

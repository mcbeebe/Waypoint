/**
 * Proactive gap detection (P3) — "Waypoint noticed".
 *
 * Deterministic rules over the family profile plus AI-extracted gap
 * memories. Each rule names something THIS family appears to be missing
 * and hands them a ready question for the Navigator. Pure module — no
 * react-native imports — so the rules stay unit-testable.
 */

export interface GapPrompt {
  /** Stable id used for per-family dismissal */
  id: string;
  emoji: string;
  title: string;
  body: string;
  /** The question one tap sends to the AI Navigator */
  ask: string;
}

export interface GapInput {
  childAgeYears: number | null;
  /** Diagnosis display names (e.g. "autism (ASD)") */
  diagnoses: string[];
  /** children.rc_status: 'unknown' | 'known' | 'applied' | 'active' */
  rcStatus: string | null;
  /** children.iep_status: 'no' | 'unknown' | 'eval_done' | 'active' | 'na' */
  iepStatus: string | null;
  /** families.insurance_carrier: 'private' | 'medicaid' | 'both' | 'none' | free text */
  insurance: string | null;
  /** Contents of kind='gap' family memories (AI-noticed, family-specific) */
  memoryGaps: string[];
}

/** Ordered by priority — the Home card shows the top result(s) */
export function detectGaps(input: GapInput): GapPrompt[] {
  const gaps: GapPrompt[] = [];
  const { childAgeYears: age, diagnoses, rcStatus, iepStatus, insurance } = input;
  // PDA is an autism-spectrum profile — autism-linked supports apply
  const hasAutism = diagnoses.some((d) => /autism|asd|pda/i.test(d));

  // AI-noticed gaps come first — they're specific to this family
  input.memoryGaps.slice(0, 2).forEach((content, i) => {
    gaps.push({
      id: `memory-gap-${hashString(content)}`,
      emoji: '💡',
      title: 'Waypoint noticed something',
      body: content,
      ask: `You noticed this about our family: "${content}". What should we do about it?`,
    });
    void i;
  });

  // Not connected to the Regional Center at all — the front door
  if (!rcStatus || rcStatus === 'unknown') {
    gaps.push({
      id: 'rc-not-started',
      emoji: '🏛️',
      title: "You may be leaving Regional Center services unclaimed",
      body: 'California guarantees services through Regional Centers under the Lanterman Act — respite hours, therapies, and more. One phone call starts intake.',
      ask: 'How do I refer my child to our Regional Center, and what services could we get?',
    });
  }

  // The age-3 cliff — Early Start ends abruptly
  if (age != null && age >= 2.5 && age < 3.5) {
    gaps.push({
      id: 'age-3-transition',
      emoji: '🎂',
      title: 'The age-3 transition is coming',
      body: 'At the third birthday, Early Start ends and services move to the school district. Families who plan at 2½ avoid a services gap.',
      ask: 'My child is turning 3 soon — walk me through the Early Start to preschool transition step by step.',
    });
  }

  // School-age with no IEP conversation started
  if (age != null && age >= 3 && (iepStatus === 'no' || iepStatus === 'unknown' || !iepStatus)) {
    gaps.push({
      id: 'iep-not-started',
      emoji: '🏫',
      title: 'Your child may be owed a school evaluation',
      body: 'A written request forces the district to respond with an assessment plan within 15 days — even before kindergarten. Many families wait years longer than they need to.',
      ask: 'How do I request a school district evaluation for my child in writing?',
    });
  }

  // No public coverage at all
  if (insurance === 'none') {
    gaps.push({
      id: 'no-insurance',
      emoji: '🏥',
      title: 'Your child likely qualifies for Medi-Cal',
      body: "Through the DD waiver, a Regional Center child can get Medi-Cal regardless of parent income — covering copays, supplies, and unlocking IHSS.",
      ask: 'How do we get Medi-Cal for our child through the institutional deeming waiver?',
    });
  }

  // Private-only insurance: missing the Medi-Cal secondary everyone qualifies for
  if (insurance === 'private') {
    gaps.push({
      id: 'deeming-waiver',
      emoji: '💳',
      title: "Most families don't know: Medi-Cal can be your secondary insurance",
      body: 'The HCBS-DD waiver ignores parent income for Regional Center kids. As secondary coverage it picks up copays, diapers after age 3, and opens IHSS.',
      ask: 'Should we add Medi-Cal as secondary insurance through the DD waiver? How does it work?',
    });
  }

  // Autism + private insurance: SB 946 behavioral health mandate
  if (hasAutism && (insurance === 'private' || insurance === 'both')) {
    gaps.push({
      id: 'sb946-aba',
      emoji: '🧩',
      title: 'Your insurance must cover behavioral therapy',
      body: 'California SB 946 requires state-regulated plans to cover ABA and behavioral health treatment for autism. Denials are frequently overturned.',
      ask: 'How do I get ABA covered by our insurance under SB 946?',
    });
  }

  // IHSS: school-age + public coverage available
  if (age != null && age >= 3 && (insurance === 'medicaid' || insurance === 'both')) {
    gaps.push({
      id: 'ihss-hours',
      emoji: '🏠',
      title: 'You could be paid for the care you already provide',
      body: 'IHSS pays parents an hourly rate for supervision and personal care of a child with Medi-Cal. Protective supervision awards can reach 195 hours/month.',
      ask: 'How do we apply for IHSS and protective supervision for our child?',
    });
  }

  return gaps;
}

/** Small stable hash for memory-derived gap ids */
function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

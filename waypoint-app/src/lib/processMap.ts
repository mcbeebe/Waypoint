/**
 * The Regional Center process map (PRD W-G: G1) — the system's business
 * process made legible: stages, statutory clocks, and the lever a family
 * can pull at each step. Pure data + derivation, no I/O.
 *
 * Every clock and rule here traces to statute or a DDS directive
 * (Roadmap/Assumptions-Audit-Aug2026.md; Regional Center Money Map). When
 * a step has no enforceable clock, we say so — false clocks destroy trust.
 *
 * Bilingual (W1a ES parity): stages carry EN + ES; callers pass the
 * locale. Citations stay in English. Spanish is a careful draft — flag
 * for native-speaker review before wide release.
 */
import type { RcStatus } from '@/types/database';
import type { FunnelLocale } from '@/lib/eligibility';

export interface ProcessStage {
  key: string;
  title: string;
  /** Plain-language body, ~7th-grade reading level. */
  body: string;
  /** Statute or rule chip, e.g. "W&I §4643". Empty when none applies. */
  citation: string;
  /** The clock on this step, stated honestly ("no deadline" is valid). */
  clock: string;
  /** Letter template key (letters.ts) that pulls the lever at this step. */
  leverTemplate: string | null;
  /** Label for the lever button. */
  leverLabel: string | null;
  /**
   * Stable action keys (actionKeys.ts) whose plan items belong to this
   * stage — the map shows them live with their status, so "how the system
   * works" and "what I should do" are one surface, not two.
   */
  actionKeys: string[];
}

/** Stage 0 + Path A — every family's spine. */
export function getRcStages(locale: FunnelLocale = 'en'): ProcessStage[] {
  const es = locale === 'es';
  return [
    {
      key: 'intake',
      title: es ? 'Contactar al Centro Regional' : 'Contact the Regional Center',
      body: es
        ? 'Menores de 3 años: Early Start. A partir de 3: una solicitud bajo la Ley Lanterman. Los servicios del Centro Regional no tienen requisito de ingresos y no cuestan nada a las familias.'
        : 'Under 3: Early Start. Age 3+: a Lanterman Act application. Regional Center services have no income test and cost families nothing.',
      citation: 'Lanterman Act',
      clock: es
        ? 'Usted inicia este plazo — solicite por escrito y guarde la fecha.'
        : 'You start this clock — apply in writing and keep the date.',
      leverTemplate: null,
      leverLabel: null,
      actionKeys: ['rc_early_start_referral', 'rc_start_referral'],
    },
    {
      key: 'assessment',
      title: es ? 'Evaluación y decisión de elegibilidad' : 'Assessment & eligibility decision',
      body: es
        ? 'El Centro Regional evalúa si su hijo/a tiene una discapacidad que califica y que comenzó antes de los 18 años. Una negación debe incluir sus derechos de apelación.'
        : 'The Regional Center assesses whether your child has a qualifying disability that began before 18. A denial must come with appeal rights.',
      citation: 'W&I §4643',
      clock: es
        ? 'Evaluación dentro de 120 días desde la solicitud — o 60 si la demora es riesgosa.'
        : 'Assessment within 120 days of intake — or 60 when delay is risky.',
      leverTemplate: 'rc_timeline_followup',
      leverLabel: es ? 'Dar seguimiento a una evaluación atrasada' : 'Follow up on an overdue assessment',
      actionKeys: ['rc_follow_up_application'],
    },
    {
      key: 'ipp',
      title: es ? 'El IPP — donde empieza cada servicio' : 'The IPP — where every service starts',
      body: es
        ? 'El Plan de Programa Individual enumera los servicios que el Centro Regional proveerá. Nada se puede comprar si no está en el IPP — y usted puede pedir una reunión de revisión en cualquier momento, no solo una vez al año.'
        : 'The Individual Program Plan lists the services the Regional Center will provide. Nothing is purchasable unless it is in the IPP — and you can request a review meeting at any time, not just annually.',
      citation: 'W&I §4646 · §4646.5(b)',
      clock: es
        ? 'IPP dentro de 60 días tras la evaluación. Reunión de revisión solicitada: dentro de 30 días.'
        : 'IPP within 60 days of assessment. A requested review meeting: within 30 days.',
      leverTemplate: 'ipp_review_request',
      leverLabel: es ? 'Pedir una reunión del IPP (plazo de 30 días)' : 'Request an IPP meeting (30-day clock)',
      actionKeys: [],
    },
    {
      key: 'services',
      title: es ? 'Los servicios se autorizan — o se niegan' : 'Services get authorized — or denied',
      body: es
        ? 'Cada servicio del IPP se convierte en una autorización escrita a un proveedor. Un "no" verbal no es una decisión: usted tiene derecho a recibirla por escrito, con sus derechos de apelación.'
        : 'Each IPP service becomes a written authorization to a provider. A verbal "no" is not a decision: you are entitled to it in writing, with your appeal rights.',
      citation: 'W&I §4710',
      clock: es
        ? 'Las autorizaciones no tienen plazo fijo — pida todo por escrito y déle seguimiento.'
        : 'No fixed clock on authorizations — put requests in writing and track them.',
      leverTemplate: 'noa_request',
      leverLabel: es ? 'Exigir una Notificación de Acción por escrito' : 'Demand a written Notice of Action',
      actionKeys: [],
    },
  ];
}

/** The fork: what most families are never told. */
export function getSdpFork(locale: FunnelLocale = 'en'): ProcessStage {
  const es = locale === 'es';
  return {
    key: 'sdp',
    title: es
      ? 'El camino que nadie menciona: la Autodeterminación'
      : 'The path nobody mentions: Self-Determination',
    body: es
      ? 'En lugar de que el Centro Regional compre servicios autorización por autorización, los servicios de su hijo/a pueden convertirse en un presupuesto anual que su familia dirige. Casi todos los niños del Centro Regional califican — solo ~1.5% está inscrito. Su presupuesto inicial se basa en los últimos 12 meses de servicios autorizados más las necesidades documentadas en el IPP, así que documente las necesidades ANTES de cambiar.'
      : 'Instead of the Regional Center buying services one authorization at a time, your child’s services can become an annual budget your family directs. Nearly every Regional Center child qualifies — about 1.5% are enrolled. Your starting budget is built from the last 12 months of authorized services plus unmet needs documented in the IPP, so document needs BEFORE converting.',
    citation: 'W&I §4685.8',
    clock: es
      ? 'La inscripción no tiene plazo obligatorio — típicamente 3–12 meses. La regla de la reunión de 30 días es su herramienta en cada paso.'
      : 'No enforceable clock on enrollment — typically 3–12 months. The 30-day IPP-meeting rule is your lever at every step.',
    leverTemplate: 'sdp_info_request',
    leverLabel: es
      ? 'Preguntar por la Autodeterminación por escrito'
      : 'Ask about Self-Determination in writing',
    actionKeys: ['sdp_ask_in_writing'],
  };
}

/** English defaults kept for existing consumers and tests. */
export const RC_STAGES: ProcessStage[] = getRcStages('en');
export const SDP_FORK: ProcessStage = getSdpFork('en');

/**
 * Where "you are here" points, from the child's Regional Center status
 * captured at onboarding (children.rc_status).
 */
export function deriveStageIndex(rcStatus: RcStatus | null | undefined): number {
  switch (rcStatus) {
    case 'applied':
      return 1; // waiting on assessment/eligibility — the §4643 clock matters now
    case 'active':
      return 2; // consumer with (or due) an IPP — the meeting lever matters now
    case 'known':
    case 'unknown':
    default:
      return 0; // not yet applied
  }
}

/** Whether the SDP fork applies yet (only consumers can enroll). */
export function sdpAvailable(rcStatus: RcStatus | null | undefined): boolean {
  return rcStatus === 'active';
}

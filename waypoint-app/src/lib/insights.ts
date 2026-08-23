/**
 * Home insights — "Waypoint noticed" (elevating the paths families are
 * never told about). One derivation, one card: the single highest-leverage
 * thing this family's profile says they are entitled to but not using.
 * Pure logic, no I/O; EN + ES like the rest of the funnel modules.
 *
 * Priority order is deliberate: the SDP fork outranks everything for
 * active consumers (near-universal eligibility, ~1.5% enrollment), then
 * the RC application itself, then the running clock, then the IEP right.
 */
import type { RcStatus, IepStatus } from '@/types/database';
import type { FunnelLocale } from '@/lib/eligibility';

export interface HomeInsight {
  key: 'sdp_path' | 'rc_apply' | 'rc_clock' | 'iep_eval';
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  /** Home-stack destination (screen name + optional params). */
  target: { screen: string; params?: Record<string, string> };
  citation: string;
}

export interface InsightInput {
  ageYears: number | null;
  rcStatus: RcStatus | null | undefined;
  iepStatus: IepStatus | null | undefined;
  hasDiagnosis: boolean;
  childName?: string | null;
}

export function deriveHomeInsight(
  input: InsightInput,
  locale: FunnelLocale = 'en'
): HomeInsight | null {
  const es = locale === 'es';
  const { ageYears, rcStatus, iepStatus, hasDiagnosis } = input;
  const name = input.childName || (es ? 'su hijo/a' : 'your child');
  const eyebrow = es ? 'WAYPOINT NOTÓ' : 'WAYPOINT NOTICED';

  if (rcStatus === 'active') {
    return {
      key: 'sdp_path',
      eyebrow,
      title: es
        ? `Los servicios de ${name} podrían convertirse en un presupuesto que usted dirige`
        : `${name}'s services could become a budget you direct`,
      body: es
        ? 'Como consumidor del Centro Regional, casi con certeza califica para el Programa de Autodeterminación — solo ~1.5% de las familias está inscrito, porque rara vez se lo cuentan. Una carta lo inicia.'
        : 'As a Regional Center consumer, they almost certainly qualify for Self-Determination — only ~1.5% of families are enrolled, because families are rarely told. One letter starts it.',
      ctaLabel: es ? 'Ver el camino →' : 'See the path →',
      target: { screen: 'ProcessMap' },
      citation: 'W&I §4685.8',
    };
  }

  if (rcStatus === 'applied') {
    return {
      key: 'rc_clock',
      eyebrow,
      title: es
        ? 'Hay un plazo legal corriendo a su favor'
        : 'A legal clock is running in your favor',
      body: es
        ? `La evaluación de ${name} debe completarse dentro de 120 días de la solicitud. Registre la fecha y Waypoint vigila el plazo con usted.`
        : `${name}'s assessment must be completed within 120 days of applying. Log the date and Waypoint watches the clock with you.`,
      ctaLabel: es ? 'Seguir el plazo →' : 'Track the clock →',
      target: { screen: 'RequestTracker' },
      citation: 'W&I §4643',
    };
  }

  if (hasDiagnosis && (rcStatus === 'unknown' || rcStatus === 'known' || !rcStatus)) {
    return {
      key: 'rc_apply',
      eyebrow,
      title: es
        ? `${name} probablemente tiene derecho a servicios que aún no usa`
        : `${name} is likely entitled to services you're not using yet`,
      body: es
        ? 'Los servicios del Centro Regional no tienen requisito de ingresos, no tienen lista de espera y no cuestan nada — y la solicitud la inicia usted, por escrito.'
        : 'Regional Center services have no income test, no waiting list, and no cost — and the application starts with you, in writing.',
      ctaLabel: es ? 'Cómo funciona el sistema →' : 'See how the system works →',
      target: { screen: 'ProcessMap' },
      citation: 'Lanterman Act',
    };
  }

  if (
    ageYears !== null &&
    ageYears >= 3 &&
    ageYears < 22 &&
    (iepStatus === 'no' || iepStatus === 'unknown')
  ) {
    return {
      key: 'iep_eval',
      eyebrow,
      title: es
        ? 'Una carta inicia un plazo de 15 días en la escuela'
        : 'One letter starts a 15-day clock at school',
      body: es
        ? `Una solicitud escrita de evaluación de educación especial obliga al distrito a responder con un plan de evaluación en 15 días calendario.`
        : `A written special-education evaluation request forces the district to respond with an assessment plan within 15 calendar days.`,
      ctaLabel: es ? 'Redactar la carta →' : 'Draft the letter →',
      target: { screen: 'Letters', params: { template: 'assessment_request' } },
      citation: 'Ed Code §56321',
    };
  }

  return null;
}

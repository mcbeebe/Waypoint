/**
 * Eligibility derivation (PRD W-B: B1) — turns onboarding data into an
 * answer: what this child likely qualifies for, with the statute and a
 * review date on every card. Pure logic, no I/O.
 *
 * Honesty rules (from the mockup review): no dollar value we can't derive,
 * "likely eligible" vs "needs review" is never a false binary, and every
 * card carries its citation + last-reviewed date (content provenance).
 *
 * Bilingual (W1a ES parity): callers pass the locale; content carries EN
 * and ES. Legal citations stay in English (same rule as the letters
 * engine). Spanish is a careful draft — flag for native-speaker review
 * before wide release.
 */
import type { RcStatus, IepStatus } from '@/types/database';
import { SSI_FBR_MONTHLY, SSI_YEAR } from '@/data/benefitFigures';

export type EligibilityStatus = 'enrolled' | 'likely' | 'review' | 'later';
export type FunnelLocale = 'en' | 'es';

export interface EligibilityCard {
  key: string;
  title: string;
  body: string;
  status: EligibilityStatus;
  statusLabel: string;
  /** A fact line, e.g. the current SSI federal rate + CA supplement. */
  factLabel: string | null;
  factValue: string | null;
  citation: string;
  reviewedOn: string; // ISO date the content was last verified
}

export interface EligibilityInput {
  ageYears: number | null;
  rcStatus: RcStatus | null | undefined;
  iepStatus: IepStatus | null | undefined;
  hasDiagnosis: boolean;
}

export interface EligibilityResult {
  cards: EligibilityCard[];
  /** Programs shown as likely/enrolled — the hero number. */
  likelyCount: number;
}

const REVIEWED = '2026-08-23'; // bump when card content is re-verified

const STATUS_LABELS: Record<FunnelLocale, Record<EligibilityStatus | 'right', string>> = {
  en: {
    enrolled: 'Enrolled ✓',
    likely: 'Likely eligible',
    review: 'Needs review',
    later: 'After enrollment',
    right: 'Your right',
  },
  es: {
    enrolled: 'Inscrito ✓',
    likely: 'Probablemente elegible',
    review: 'Requiere revisión',
    later: 'Después de inscribirse',
    right: 'Su derecho',
  },
};

export function deriveEligibility(
  input: EligibilityInput,
  locale: FunnelLocale = 'en'
): EligibilityResult {
  const { ageYears, rcStatus, iepStatus, hasDiagnosis } = input;
  const cards: EligibilityCard[] = [];
  const SL = STATUS_LABELS[locale];
  const es = locale === 'es';

  // Early Start — under 3
  if (ageYears !== null && ageYears < 3) {
    cards.push({
      key: 'early_start',
      title: es ? 'Early Start (edades 0–3)' : 'Early Start (ages 0–3)',
      body: es
        ? 'Intervención temprana a través de su Centro Regional — evaluaciones y servicios para bebés y niños pequeños, sin costo.'
        : 'Early intervention through your Regional Center — evaluations and services for infants and toddlers, at no cost.',
      status: 'likely',
      statusLabel: SL.likely,
      factLabel: es ? 'Quién lo administra' : 'Who runs it',
      factValue: es ? 'Su Centro Regional (IDEA Parte C)' : 'Your Regional Center (IDEA Part C)',
      citation: 'IDEA Part C · Early Start',
      reviewedOn: REVIEWED,
    });
  }

  // Regional Center (Lanterman) — the anchor card
  if (rcStatus === 'active') {
    cards.push({
      key: 'regional_center',
      title: es ? 'Servicios del Centro Regional' : 'Regional Center services',
      body: es
        ? 'Su hijo/a es consumidor del Centro Regional. Los servicios provienen del IPP — y usted puede pedir una reunión de revisión del IPP en cualquier momento (deben realizarla dentro de 30 días).'
        : 'Your child is a Regional Center consumer. Services flow from the IPP — and you can request an IPP review meeting at any time (they must hold it within 30 days).',
      status: 'enrolled',
      statusLabel: SL.enrolled,
      factLabel: es ? 'Su herramienta' : 'Your lever',
      factValue: es ? 'Reunión de revisión del IPP · 30 días' : 'IPP review meeting · 30 days',
      citation: 'W&I §4646.5(b)',
      reviewedOn: REVIEWED,
    });
  } else {
    cards.push({
      key: 'regional_center',
      title: es ? 'Servicios del Centro Regional' : 'Regional Center services',
      body: es
        ? 'Relevo (respite), apoyo conductual y servicios familiares bajo la Ley Lanterman — sin requisito de ingresos, sin lista de espera, sin costo para las familias.'
        : 'Respite, behavior support, and family services under the Lanterman Act — no income test, no waiting list, no cost to families.',
      status: hasDiagnosis ? 'likely' : 'review',
      statusLabel: hasDiagnosis ? SL.likely : SL.review,
      factLabel: es ? 'Plazo de decisión' : 'Decision clock',
      factValue: es ? 'Evaluación ≤120 días desde la solicitud' : 'Assessment ≤120 days from intake',
      citation: 'Lanterman Act, W&I §4512 · §4643',
      reviewedOn: REVIEWED,
    });
  }

  // SDP — only real once a consumer
  cards.push(
    rcStatus === 'active'
      ? {
          key: 'sdp',
          title: es ? 'Programa de Autodeterminación (SDP)' : 'Self-Determination Program',
          body: es
            ? 'Convierta los servicios del Centro Regional en un presupuesto anual que su familia dirige. Abierto a casi todos los consumidores — solo ~1.5% está inscrito, porque rara vez se lo cuentan a las familias.'
            : 'Turn Regional Center services into an annual budget your family directs. Open to nearly every consumer — about 1.5% are enrolled, because families are rarely told.',
          status: 'likely' as const,
          statusLabel: SL.likely,
          factLabel: es ? 'Base del presupuesto' : 'Budget basis',
          factValue: es
            ? 'Últimos 12 meses de servicios autorizados + necesidades documentadas'
            : 'Last 12 months of authorized services + documented unmet needs',
          citation: 'W&I §4685.8',
          reviewedOn: REVIEWED,
        }
      : {
          key: 'sdp',
          title: es ? 'Programa de Autodeterminación (SDP)' : 'Self-Determination Program',
          body: es
            ? 'Cuando su hijo/a sea consumidor del Centro Regional, los servicios pueden convertirse en un presupuesto que su familia dirige. Paso a paso — primero el Centro Regional.'
            : 'Once your child is a Regional Center consumer, services can become a budget your family directs. One step at a time — Regional Center first.',
          status: 'later' as const,
          statusLabel: SL.later,
          factLabel: null,
          factValue: null,
          citation: 'W&I §4685.8',
          reviewedOn: REVIEWED,
        }
  );

  // Special education — 3 to 22, no active IEP yet
  if (
    ageYears !== null &&
    ageYears >= 3 &&
    ageYears < 22 &&
    (iepStatus === 'no' || iepStatus === 'unknown' || iepStatus === 'eval_done')
  ) {
    cards.push({
      key: 'iep',
      title: es ? 'Evaluación de educación especial (IEP)' : 'Special education evaluation (IEP)',
      body: es
        ? 'Una solicitud por escrito inicia un plazo legal: el distrito debe entregarle un plan de evaluación dentro de 15 días calendario.'
        : 'A written request starts a legal clock: the district must give you an assessment plan within 15 calendar days.',
      status: 'likely',
      statusLabel: SL.right,
      factLabel: es ? 'Plazo' : 'Clock',
      factValue: es
        ? '15 días para el plan de evaluación · 60 días para completarla'
        : '15 days to assessment plan · 60 days to complete',
      citation: 'Ed Code §56321 · §56344',
      reviewedOn: REVIEWED,
    });
  }

  // SSI — always income-dependent, never a false promise
  cards.push({
    key: 'ssi',
    title: es ? 'Seguridad de Ingreso Suplementario (SSI)' : 'Supplemental Security Income',
    body: es
      ? 'Pagos mensuales para un niño con discapacidad — depende de los ingresos del hogar y no es automático, así que lo revisaríamos con usted.'
      : "Monthly payments for a disabled child — depends on household income and it's not automatic, so we'd check with you.",
    status: 'review',
    statusLabel: SL.review,
    factLabel: es ? `Tarifa federal ${SSI_YEAR}` : `${SSI_YEAR} federal rate`,
    factValue: es
      ? `$${SSI_FBR_MONTHLY}/mes + suplemento de CA`
      : `$${SSI_FBR_MONTHLY}/mo + CA supplement`,
    citation: `SSA ${SSI_YEAR} COLA`,
    reviewedOn: REVIEWED,
  });

  // IHSS — income-independent for the child, but assessment-dependent
  cards.push({
    key: 'ihss',
    title: es ? 'Servicios de Apoyo en el Hogar (IHSS)' : 'In-Home Supportive Services',
    body: es
      ? 'Horas pagadas de cuidado en el hogar — un padre o madre puede ser el proveedor pagado. Depende de Medi-Cal y de una necesidad evaluada.'
      : 'Paid hours for in-home care — a parent can be the paid provider. Depends on Medi-Cal and an assessed need.',
    status: 'review',
    statusLabel: SL.review,
    factLabel: es ? 'Quién puede recibir pago' : 'Who can be paid',
    factValue: es ? 'Un padre o madre cuidador/a, en muchos casos' : 'A parent caregiver, in many cases',
    citation: 'W&I §12300',
    reviewedOn: REVIEWED,
  });

  const likelyCount = cards.filter(
    (c) => c.status === 'likely' || c.status === 'enrolled'
  ).length;

  return { cards, likelyCount };
}

/** Age in whole years from an ISO date of birth; null when unknown. */
export function ageFromDob(dob: string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  let years = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) years--;
  return years;
}

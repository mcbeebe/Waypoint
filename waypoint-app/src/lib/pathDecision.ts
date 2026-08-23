/**
 * Path decision aid (PRD W-G: G2) — traditional POS vs Self-Determination,
 * answered honestly from three questions. The catches are stated, never
 * hidden: SDP budgets anchor to authorization history + documented needs,
 * it is all-in, and it carries admin. Pure logic, no I/O.
 *
 * Bilingual (W1a ES parity): callers pass the locale; defaults keep every
 * existing consumer and test on English. Spanish is a careful draft — flag
 * for native-speaker review before wide release.
 */
import type { FunnelLocale } from '@/lib/eligibility';

export interface PathAnswers {
  /** Is the child already receiving RC-purchased services regularly? */
  hasAuthorizationHistory: boolean | null;
  /** Are the family's unmet needs written into the IPP? */
  unmetNeedsDocumented: boolean | null;
  /** Does the family want to direct services (and take on the admin)? */
  wantsControl: boolean | null;
}

export type PathRecommendation =
  | 'incomplete'
  | 'stay_traditional'
  | 'document_first'
  | 'sdp_ready';

export interface PathResult {
  recommendation: PathRecommendation;
  headline: string;
  body: string;
  /** Letter template that pulls the next lever, when one applies. */
  leverTemplate: string | null;
  leverLabel: string | null;
}

export interface PathQuestion {
  key: keyof PathAnswers;
  label: string;
}

/** The three decider questions, localized for the PathDecider UI. */
export function getPathQuestions(locale: FunnelLocale = 'en'): PathQuestion[] {
  const es = locale === 'es';
  return [
    {
      key: 'hasAuthorizationHistory',
      label: es
        ? '¿Su hijo/a ya recibe servicios del Centro Regional con regularidad?'
        : 'Is your child already receiving Regional Center services regularly?',
    },
    {
      key: 'unmetNeedsDocumented',
      label: es
        ? '¿Las cosas que su hijo/a necesita (pero no recibe) están escritas en el IPP?'
        : 'Are the things your child needs (but isn’t getting) written into the IPP?',
    },
    {
      key: 'wantsControl',
      label: es
        ? '¿Quiere elegir a los proveedores y administrar un presupuesto ustedes mismos?'
        : 'Do you want to choose providers and manage a budget yourselves?',
    },
  ];
}

export function decidePath(answers: PathAnswers, locale: FunnelLocale = 'en'): PathResult {
  const { hasAuthorizationHistory, unmetNeedsDocumented, wantsControl } = answers;
  const es = locale === 'es';

  if (
    hasAuthorizationHistory === null ||
    unmetNeedsDocumented === null ||
    wantsControl === null
  ) {
    return {
      recommendation: 'incomplete',
      headline: es ? 'Responda las tres preguntas' : 'Answer the three questions',
      body: es
        ? 'Sus respuestas se quedan en esta pantalla — solo dan forma a la recomendación.'
        : 'Your answers stay on this screen — they just shape the recommendation.',
      leverTemplate: null,
      leverLabel: null,
    };
  }

  if (!wantsControl) {
    return {
      recommendation: 'stay_traditional',
      headline: es
        ? 'El camino tradicional puede servirle mejor — con las herramientas'
        : 'The traditional path may serve you better — with the levers',
      body: es
        ? 'La Autodeterminación le entrega a su familia la administración junto con el control. Si ese intercambio no le conviene ahora, quedarse en el camino tradicional y usar las herramientas — solicitudes por escrito, la reunión del IPP en 30 días, Notificaciones de Acción por escrito — es una estrategia legítima, y puede reconsiderar el SDP en cualquier momento.'
        : 'Self-Determination hands your family the admin along with the control. If that trade isn’t right now, staying on the traditional path and working the levers — written requests, the 30-day IPP meeting, written Notices of Action — is a legitimate strategy, and you can revisit SDP any time.',
      leverTemplate: 'ipp_review_request',
      leverLabel: es
        ? 'Use las herramientas: pida una reunión del IPP'
        : 'Work the levers: request an IPP meeting',
    };
  }

  if (!unmetNeedsDocumented) {
    return {
      recommendation: 'document_first',
      headline: es ? 'Primero documente — luego cambie' : 'Document first — then convert',
      body: es
        ? 'Su presupuesto inicial del SDP se construye con los últimos 12 meses de servicios autorizados MÁS las necesidades no cubiertas documentadas en el IPP. Cambiar antes de que las necesidades estén por escrito fija un presupuesto más pequeño. Primero póngalas en el IPP — la reunión debe realizarse dentro de 30 días de su solicitud escrita.'
        : 'Your starting SDP budget is built from the last 12 months of authorized services PLUS unmet needs documented in the IPP. Converting before the needs are in writing locks in a smaller budget. Get them into the IPP first — the meeting must happen within 30 days of your written request.',
      leverTemplate: 'ipp_review_request',
      leverLabel: es
        ? 'Pedir la reunión del IPP (plazo de 30 días)'
        : 'Request the IPP meeting (30-day clock)',
    };
  }

  return {
    recommendation: 'sdp_ready',
    headline: es
      ? 'La Autodeterminación parece una buena opción'
      : 'Self-Determination looks like a fit',
    body: hasAuthorizationHistory
      ? es
        ? 'Tiene historial de autorizaciones para sembrar un presupuesto real y necesidades documentadas para hacerlo crecer. Siguiente paso: la orientación del SDP y una solicitud escrita de los registros de autorización de su hijo/a — la base del presupuesto.'
        : 'You have authorization history to seed a real budget and documented needs to grow it. Next step: the SDP orientation and a written request for your child’s authorization records — the budget basis.'
      : es
        ? 'Con poco historial de autorizaciones, su presupuesto dependerá de las necesidades no cubiertas documentadas en su IPP — asegúrese de que sean exhaustivas. Siguiente paso: la orientación del SDP y una solicitud de información por escrito.'
        : 'With little authorization history, your budget will lean on the unmet needs documented in your IPP — make sure they are thorough. Next step: the SDP orientation and a written information request.',
    leverTemplate: 'sdp_info_request',
    leverLabel: es
      ? 'Preguntar por la Autodeterminación por escrito'
      : 'Ask about Self-Determination in writing',
  };
}

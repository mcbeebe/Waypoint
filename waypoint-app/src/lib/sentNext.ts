/**
 * The sent moment (owner feedback, Aug 2026): hitting send on a lever
 * letter is the bravest thing a parent does in this app — it deserves a
 * congratulation, a crisp "what happens now," and expectations set
 * honestly. Per-template because the truth differs: some sends start a
 * legal clock, some don't, and pretending otherwise burns trust.
 *
 * Every entry also says how Waypoint keeps watch: which request row to
 * open (the Request Tracker computes the statutory deadline from it) and
 * when to nudge if silence. Pure data + derivation, no I/O.
 *
 * Bilingual like the rest of the funnel modules (default 'en' keeps every
 * existing caller and test green). Citations stay English; Spanish is a
 * careful draft flagged for native-speaker review.
 */
import type { RequestType } from '@/lib/requestClocks';
import type { FunnelLocale } from '@/lib/eligibility';

export interface SentNext {
  /** The headline — earned, specific, never generic confetti. */
  celebration: string;
  /** What this send actually did, in one sentence. */
  did: string;
  /** What happens now — 2–4 honest bullets in time order. */
  expectations: string[];
  /**
   * Request-tracker row to open so the clock (when the law gives one) is
   * watched automatically. Null when tracking would duplicate an existing
   * row (e.g. a follow-up letter). Titles stay English — they are shared
   * tracker data, like appointment records.
   */
  track: { requestType: RequestType; title: string } | null;
  /** Days of silence before the app suggests the follow-up lever. */
  followUpDays: number;
}

export function sentNextFor(
  templateKey: string,
  childName?: string | null,
  locale: FunnelLocale = 'en'
): SentNext | null {
  const es = locale === 'es';
  const name = childName || (es ? 'su hijo/a' : 'your child');
  switch (templateKey) {
    case 'sdp_info_request':
      return {
        celebration: es
          ? 'Acaba de hacer la pregunta que la mayoría de las familias nunca hace.'
          : 'You just asked the question most families never do.',
        did: es
          ? `Solo ~1.5% de las familias del Centro Regional está inscrito en la Autodeterminación — pedirla por escrito pone a ${name} en el camino.`
          : `Only about 1.5% of Regional Center families are enrolled in Self-Determination — asking in writing puts ${name} on the path.`,
        expectations: es
          ? [
              'Su coordinador/a de servicios debe responder con una referencia a la orientación — hay sesiones con regularidad, a menudo mensuales.',
              `Las copias de las autorizaciones de ${name} son la base del presupuesto — guárdelas cuando lleguen.`,
              'No hay plazo legal para el SDP en sí (honestamente: la inscripción suele tomar de 3 a 12 meses) — pero cada paso se puede impulsar con la regla de la reunión del IPP en 30 días.',
              'Próximo hito: asista a la orientación y luego haga que las necesidades no cubiertas queden escritas en el IPP ANTES de cambiar — eso protege el presupuesto.',
            ]
          : [
              'Your Service Coordinator should reply with an orientation referral — sessions run regularly, often monthly.',
              `The copies of ${name}'s authorizations are the budget basis — file them when they arrive.`,
              'There is no legal clock on SDP itself (honestly: enrollment typically takes 3–12 months) — but every step along the way can be pushed with the 30-day IPP-meeting rule.',
              'Next milestone: attend the orientation, then get unmet needs written into the IPP BEFORE converting — that protects the budget.',
            ],
        track: { requestType: 'other', title: 'SDP orientation & records request' },
        followUpDays: 14,
      };
    case 'ipp_review_request':
      return {
        celebration: es
          ? 'Acaba de iniciar un plazo legal de 30 días.'
          : 'You just started a 30-day legal clock.',
        did: es
          ? 'El Centro Regional debe realizar la reunión del IPP dentro de 30 días de su solicitud escrita — W&I §4646.5(b).'
          : 'The Regional Center must hold the IPP meeting within 30 days of your written request — W&I §4646.5(b).',
        expectations: es
          ? [
              'Espere contacto para agendar de su coordinador/a — en días, no semanas.',
              'Waypoint está siguiendo el plazo de 30 días en sus Solicitudes.',
              'Antes de la reunión: escriba la lista de necesidades no cubiertas — todo lo que quiere en el plan, por escrito.',
              '¿Sin respuesta en 2 semanas? La carta de seguimiento cita el estatuto y la fecha.',
            ]
          : [
              'Expect scheduling contact from your Service Coordinator — days, not weeks.',
              'Waypoint is tracking the 30-day deadline in your Requests.',
              'Before the meeting: write the unmet-needs list — everything you want in the plan, in writing.',
              'No response in 2 weeks? The follow-up letter cites the statute and the date.',
            ],
        track: { requestType: 'ipp_meeting', title: 'IPP review meeting request' },
        followUpDays: 14,
      };
    case 'assessment_request':
      return {
        celebration: es
          ? 'Acaba de iniciar un plazo legal de 15 días.'
          : 'You just started a 15-day legal clock.',
        did: es
          ? 'El distrito debe responder con un plan de evaluación dentro de 15 días calendario — Ed Code §56321.'
          : 'The district must respond with an assessment plan within 15 calendar days — Ed Code §56321.',
        expectations: es
          ? [
              'Llegará un plan de evaluación para su firma — léalo y fírmelo pronto.',
              'Después de su consentimiento, el distrito tiene 60 días para completar la evaluación y realizar la reunión del IEP.',
              'Waypoint está siguiendo el plazo de 15 días en sus Solicitudes.',
              'El silencio después del plazo es una violación, no una demora — la carta de seguimiento lo dice con cortesía.',
            ]
          : [
              'An assessment plan arrives for your signature — read it and sign promptly.',
              'After you consent, the district has 60 days to complete the evaluation and hold the IEP meeting.',
              'Waypoint is tracking the 15-day deadline in your Requests.',
              'Silence past the deadline is a violation, not a delay — the follow-up letter says so politely.',
            ],
        track: { requestType: 'iep_evaluation', title: 'Special education evaluation request' },
        followUpDays: 10,
      };
    case 'noa_request':
      return {
        celebration: es
          ? 'Acaba de convertir un "no" de pasillo en una decisión real.'
          : 'You just turned a hallway "no" into a real decision.',
        did: es
          ? 'Una negación debe llegar como Notificación de Acción escrita con sus derechos de apelación — W&I §4710. Lo verbal no es una decisión.'
          : 'A denial must come as a written Notice of Action with your appeal rights — W&I §4710. Verbal is not a decision.',
        expectations: es
          ? [
              'La NOA escrita debe llegar pronto — cuando llegue, empiezan sus plazos de apelación (y Waypoint puede redactar la apelación).',
              'Si nunca llega, ese silencio es su evidencia — Waypoint está siguiendo esta solicitud.',
              'Mientras tanto, siga documentando los servicios; nada de su solicitud se pausa.',
            ]
          : [
              'The written NOA should arrive promptly — when it does, your appeal clocks start (and Waypoint can draft the appeal).',
              'If it never comes, that silence itself is your evidence — Waypoint is tracking this request.',
              'Keep providing services records in the meantime; nothing about your request pauses.',
            ],
        track: { requestType: 'authorization', title: 'Written Notice of Action demanded' },
        followUpDays: 10,
      };
    case 'records_request':
      return {
        celebration: es
          ? `Acaba de reclamar el expediente de ${name}.`
          : `You just claimed ${name}'s paper trail.`,
        did: es
          ? 'Los registros son la evidencia de todo lo que sigue — revisiones del IPP, apelaciones y la base del presupuesto del SDP.'
          : 'Records are the evidence for everything that comes next — IPP reviews, appeals, and the SDP budget basis.',
        expectations: es
          ? [
              'Registros escolares: el distrito debe entregarlos dentro de 5 días hábiles — Ed Code §56504.',
              'Registros del Centro Regional: sin estatuto fijo, pero "con prontitud" es el estándar — 2 semanas de silencio ameritan un seguimiento.',
              'Cuando lleguen, agregue el IPP a Documentos en Waypoint para que todo viva en un solo lugar.',
            ]
          : [
              'School records: the district must provide them within 5 business days — Ed Code §56504.',
              'Regional Center records: no fixed statute, but "promptly" is the standard — 2 weeks of silence earns a follow-up.',
              `When they arrive, add the IPP to Waypoint's Documents so everything lives in one place.`,
            ],
        track: { requestType: 'other', title: 'Records request (IPP, assessments, authorizations)' },
        followUpDays: 10,
      };
    case 'rc_timeline_followup':
      return {
        celebration: es ? 'Expediente reforzado.' : 'Paper trail reinforced.',
        did: es
          ? 'Un seguimiento escrito que cita el estatuto y la fecha es exactamente lo que mueve solicitudes estancadas — y exactamente lo que un juez administrativo quiere ver si se llega a eso.'
          : 'A written follow-up citing the statute and the date is exactly what moves stalled requests — and exactly what a hearing officer wants to see if it comes to that.',
        expectations: es
          ? [
              'Las agencias suelen moverse a los pocos días de un seguimiento que cita el estatuto.',
              'Si este también queda sin respuesta, el siguiente paso es una queja §4731 — Waypoint puede redactarla.',
            ]
          : [
              'Agencies usually move within days of a statute-citing follow-up.',
              'If this one goes unanswered too, the next step is a §4731 complaint — Waypoint can draft it.',
            ],
        track: null, // it follows up an existing tracked request
        followUpDays: 7,
      };
    default:
      return null;
  }
}

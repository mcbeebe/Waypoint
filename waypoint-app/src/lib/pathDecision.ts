/**
 * Path decision aid (PRD W-G: G2) — traditional POS vs Self-Determination,
 * answered honestly from three questions. The catches are stated, never
 * hidden: SDP budgets anchor to authorization history + documented needs,
 * it is all-in, and it carries admin. Pure logic, no I/O.
 *
 * Trilingual (EN/ES/VI): defaults keep every existing consumer and test on
 * English. Spanish and Vietnamese are careful drafts — flag for
 * native-speaker review before wide release.
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

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

/** The three decider questions, localized for the PathDecider UI. */
export function getPathQuestions(locale: FunnelLocale = 'en'): PathQuestion[] {
  const L = picker(locale);
  return [
    {
      key: 'hasAuthorizationHistory',
      label: L(
        'Is your child already receiving Regional Center services regularly?',
        '¿Su hijo/a ya recibe servicios del Centro Regional con regularidad?',
        'Con quý vị đã nhận dịch vụ Trung tâm Khu vực đều đặn chưa?'
      ),
    },
    {
      key: 'unmetNeedsDocumented',
      label: L(
        'Are the things your child needs (but isn’t getting) written into the IPP?',
        '¿Las cosas que su hijo/a necesita (pero no recibe) están escritas en el IPP?',
        'Những gì con quý vị cần (nhưng chưa nhận được) đã được ghi vào IPP chưa?'
      ),
    },
    {
      key: 'wantsControl',
      label: L(
        'Do you want to choose providers and manage a budget yourselves?',
        '¿Quiere elegir a los proveedores y administrar un presupuesto ustedes mismos?',
        'Quý vị có muốn tự chọn nhà cung cấp và tự quản lý ngân sách không?'
      ),
    },
  ];
}

export function decidePath(answers: PathAnswers, locale: FunnelLocale = 'en'): PathResult {
  const { hasAuthorizationHistory, unmetNeedsDocumented, wantsControl } = answers;
  const L = picker(locale);

  if (
    hasAuthorizationHistory === null ||
    unmetNeedsDocumented === null ||
    wantsControl === null
  ) {
    return {
      recommendation: 'incomplete',
      headline: L(
        'Answer the three questions',
        'Responda las tres preguntas',
        'Trả lời ba câu hỏi'
      ),
      body: L(
        'Your answers stay on this screen — they just shape the recommendation.',
        'Sus respuestas se quedan en esta pantalla — solo dan forma a la recomendación.',
        'Câu trả lời chỉ ở lại trên màn hình này — chúng chỉ định hình khuyến nghị.'
      ),
      leverTemplate: null,
      leverLabel: null,
    };
  }

  if (!wantsControl) {
    return {
      recommendation: 'stay_traditional',
      headline: L(
        'The traditional path may serve you better — with the levers',
        'El camino tradicional puede servirle mejor — con las herramientas',
        'Con đường truyền thống có thể phù hợp hơn — kèm các công cụ'
      ),
      body: L(
        'Self-Determination hands your family the admin along with the control. If that trade isn’t right now, staying on the traditional path and working the levers — written requests, the 30-day IPP meeting, written Notices of Action — is a legitimate strategy, and you can revisit SDP any time.',
        'La Autodeterminación le entrega a su familia la administración junto con el control. Si ese intercambio no le conviene ahora, quedarse en el camino tradicional y usar las herramientas — solicitudes por escrito, la reunión del IPP en 30 días, Notificaciones de Acción por escrito — es una estrategia legítima, y puede reconsiderar el SDP en cualquier momento.',
        'Tự quyết trao cho gia đình quyền kiểm soát kèm theo việc quản lý hành chính. Nếu chưa phù hợp lúc này, ở lại con đường truyền thống và dùng các công cụ — yêu cầu bằng văn bản, họp IPP trong 30 ngày, Thông báo Hành động bằng văn bản — là một chiến lược chính đáng, và quý vị có thể xem lại SDP bất cứ lúc nào.'
      ),
      leverTemplate: 'ipp_review_request',
      leverLabel: L(
        'Work the levers: request an IPP meeting',
        'Use las herramientas: pida una reunión del IPP',
        'Dùng công cụ: yêu cầu họp IPP'
      ),
    };
  }

  if (!unmetNeedsDocumented) {
    return {
      recommendation: 'document_first',
      headline: L(
        'Document first — then convert',
        'Primero documente — luego cambie',
        'Ghi nhận trước — rồi mới chuyển'
      ),
      body: L(
        'Your starting SDP budget is built from the last 12 months of authorized services PLUS unmet needs documented in the IPP. Converting before the needs are in writing locks in a smaller budget. Get them into the IPP first — the meeting must happen within 30 days of your written request.',
        'Su presupuesto inicial del SDP se construye con los últimos 12 meses de servicios autorizados MÁS las necesidades no cubiertas documentadas en el IPP. Cambiar antes de que las necesidades estén por escrito fija un presupuesto más pequeño. Primero póngalas en el IPP — la reunión debe realizarse dentro de 30 días de su solicitud escrita.',
        'Ngân sách SDP khởi điểm dựa trên 12 tháng dịch vụ đã duyệt gần nhất CỘNG với nhu cầu chưa đáp ứng ghi trong IPP. Chuyển đổi trước khi nhu cầu được ghi bằng văn bản sẽ chốt một ngân sách nhỏ hơn. Hãy đưa chúng vào IPP trước — cuộc họp phải diễn ra trong 30 ngày kể từ yêu cầu bằng văn bản.'
      ),
      leverTemplate: 'ipp_review_request',
      leverLabel: L(
        'Request the IPP meeting (30-day clock)',
        'Pedir la reunión del IPP (plazo de 30 días)',
        'Yêu cầu họp IPP (thời hạn 30 ngày)'
      ),
    };
  }

  return {
    recommendation: 'sdp_ready',
    headline: L(
      'Self-Determination looks like a fit',
      'La Autodeterminación parece una buena opción',
      'Tự quyết có vẻ phù hợp'
    ),
    body: hasAuthorizationHistory
      ? L(
          'You have authorization history to seed a real budget and documented needs to grow it. Next step: the SDP orientation and a written request for your child’s authorization records — the budget basis.',
          'Tiene historial de autorizaciones para sembrar un presupuesto real y necesidades documentadas para hacerlo crecer. Siguiente paso: la orientación del SDP y una solicitud escrita de los registros de autorización de su hijo/a — la base del presupuesto.',
          'Quý vị có lịch sử ủy quyền để tạo ngân sách thực và nhu cầu đã ghi nhận để tăng nó. Bước tiếp theo: buổi định hướng SDP và yêu cầu bằng văn bản về hồ sơ ủy quyền của con — cơ sở ngân sách.'
        )
      : L(
          'With little authorization history, your budget will lean on the unmet needs documented in your IPP — make sure they are thorough. Next step: the SDP orientation and a written information request.',
          'Con poco historial de autorizaciones, su presupuesto dependerá de las necesidades no cubiertas documentadas en su IPP — asegúrese de que sean exhaustivas. Siguiente paso: la orientación del SDP y una solicitud de información por escrito.',
          'Với ít lịch sử ủy quyền, ngân sách sẽ dựa vào nhu cầu chưa đáp ứng ghi trong IPP — hãy bảo đảm chúng đầy đủ. Bước tiếp theo: buổi định hướng SDP và yêu cầu thông tin bằng văn bản.'
        ),
    leverTemplate: 'sdp_info_request',
    leverLabel: L(
      'Ask about Self-Determination in writing',
      'Preguntar por la Autodeterminación por escrito',
      'Hỏi về Tự quyết bằng văn bản'
    ),
  };
}

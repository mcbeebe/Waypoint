/**
 * The Regional Center process map (PRD W-G: G1) — the system's business
 * process made legible: stages, statutory clocks, and the lever a family
 * can pull at each step. Pure data + derivation, no I/O.
 *
 * Every clock and rule here traces to statute or a DDS directive
 * (Roadmap/Assumptions-Audit-Aug2026.md; Regional Center Money Map). When
 * a step has no enforceable clock, we say so — false clocks destroy trust.
 *
 * Trilingual (EN/ES/VI): callers pass the locale; strings select via
 * L(en, es, vi). Citations stay in English. Spanish and Vietnamese are
 * careful drafts — flag for native-speaker review before wide release.
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

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

/** Stage 0 + Path A — every family's spine. */
export function getRcStages(locale: FunnelLocale = 'en'): ProcessStage[] {
  const L = picker(locale);
  return [
    {
      key: 'intake',
      title: L(
        'Contact the Regional Center',
        'Contactar al Centro Regional',
        'Liên hệ Trung tâm Khu vực'
      ),
      body: L(
        'Under 3: Early Start. Age 3+: a Lanterman Act application. Regional Center services have no income test and cost families nothing.',
        'Menores de 3 años: Early Start. A partir de 3: una solicitud bajo la Ley Lanterman. Los servicios del Centro Regional no tienen requisito de ingresos y no cuestan nada a las familias.',
        'Dưới 3 tuổi: Early Start. Từ 3 tuổi: nộp đơn theo Đạo luật Lanterman. Dịch vụ Trung tâm Khu vực không xét thu nhập và hoàn toàn miễn phí cho gia đình.'
      ),
      citation: 'Lanterman Act',
      clock: L(
        'You start this clock — apply in writing and keep the date.',
        'Usted inicia este plazo — solicite por escrito y guarde la fecha.',
        'Quý vị khởi động thời hạn này — nộp đơn bằng văn bản và giữ lại ngày nộp.'
      ),
      leverTemplate: null,
      leverLabel: null,
      actionKeys: ['rc_early_start_referral', 'rc_start_referral'],
    },
    {
      key: 'assessment',
      title: L(
        'Assessment & eligibility decision',
        'Evaluación y decisión de elegibilidad',
        'Đánh giá & quyết định điều kiện'
      ),
      body: L(
        'The Regional Center assesses whether your child has a qualifying disability that began before 18. A denial must come with appeal rights.',
        'El Centro Regional evalúa si su hijo/a tiene una discapacidad que califica y que comenzó antes de los 18 años. Una negación debe incluir sus derechos de apelación.',
        'Trung tâm Khu vực đánh giá xem con quý vị có khuyết tật đủ điều kiện, khởi phát trước 18 tuổi hay không. Nếu từ chối, họ phải kèm theo quyền kháng cáo.'
      ),
      citation: 'W&I §4643',
      clock: L(
        'Assessment within 120 days of intake — or 60 when delay is risky.',
        'Evaluación dentro de 120 días desde la solicitud — o 60 si la demora es riesgosa.',
        'Đánh giá trong 120 ngày kể từ khi nộp đơn — hoặc 60 ngày nếu trì hoãn gây rủi ro.'
      ),
      leverTemplate: 'rc_timeline_followup',
      leverLabel: L(
        'Follow up on an overdue assessment',
        'Dar seguimiento a una evaluación atrasada',
        'Theo dõi đánh giá quá hạn'
      ),
      actionKeys: ['rc_follow_up_application'],
    },
    {
      key: 'ipp',
      title: L(
        'The IPP — where every service starts',
        'El IPP — donde empieza cada servicio',
        'IPP — nơi mọi dịch vụ bắt đầu'
      ),
      body: L(
        'The Individual Program Plan lists the services the Regional Center will provide. Nothing is purchasable unless it is in the IPP — and you can request a review meeting at any time, not just annually.',
        'El Plan de Programa Individual enumera los servicios que el Centro Regional proveerá. Nada se puede comprar si no está en el IPP — y usted puede pedir una reunión de revisión en cualquier momento, no solo una vez al año.',
        'Kế hoạch Chương trình Cá nhân (IPP) liệt kê các dịch vụ Trung tâm Khu vực sẽ cung cấp. Không có gì được chi trả nếu không nằm trong IPP — và quý vị có thể yêu cầu họp xem xét bất cứ lúc nào, không chỉ mỗi năm một lần.'
      ),
      citation: 'W&I §4646 · §4646.5(b)',
      clock: L(
        'IPP within 60 days of assessment. A requested review meeting: within 30 days.',
        'IPP dentro de 60 días tras la evaluación. Reunión de revisión solicitada: dentro de 30 días.',
        'IPP trong 60 ngày sau đánh giá. Họp xem xét theo yêu cầu: trong 30 ngày.'
      ),
      leverTemplate: 'ipp_review_request',
      leverLabel: L(
        'Request an IPP meeting (30-day clock)',
        'Pedir una reunión del IPP (plazo de 30 días)',
        'Yêu cầu họp IPP (thời hạn 30 ngày)'
      ),
      actionKeys: [],
    },
    {
      key: 'services',
      title: L(
        'Services get authorized — or denied',
        'Los servicios se autorizan — o se niegan',
        'Dịch vụ được duyệt — hoặc bị từ chối'
      ),
      body: L(
        'Each IPP service becomes a written authorization to a provider. A verbal "no" is not a decision: you are entitled to it in writing, with your appeal rights.',
        'Cada servicio del IPP se convierte en una autorización escrita a un proveedor. Un "no" verbal no es una decisión: usted tiene derecho a recibirla por escrito, con sus derechos de apelación.',
        'Mỗi dịch vụ IPP trở thành giấy ủy quyền bằng văn bản cho nhà cung cấp. Lời từ chối miệng không phải là quyết định: quý vị có quyền nhận nó bằng văn bản, kèm quyền kháng cáo.'
      ),
      citation: 'W&I §4710',
      clock: L(
        'No fixed clock on authorizations — put requests in writing and track them.',
        'Las autorizaciones no tienen plazo fijo — pida todo por escrito y déle seguimiento.',
        'Ủy quyền không có thời hạn cố định — hãy yêu cầu bằng văn bản và theo dõi.'
      ),
      leverTemplate: 'noa_request',
      leverLabel: L(
        'Demand a written Notice of Action',
        'Exigir una Notificación de Acción por escrito',
        'Yêu cầu Thông báo Hành động bằng văn bản'
      ),
      actionKeys: [],
    },
  ];
}

/** The fork: what most families are never told. */
export function getSdpFork(locale: FunnelLocale = 'en'): ProcessStage {
  const L = picker(locale);
  return {
    key: 'sdp',
    title: L(
      'The path nobody mentions: Self-Determination',
      'El camino que nadie menciona: la Autodeterminación',
      'Con đường ít ai nhắc đến: Tự quyết'
    ),
    body: L(
      'Instead of the Regional Center buying services one authorization at a time, your child’s services can become an annual budget your family directs. Nearly every Regional Center child qualifies — about 1.5% are enrolled. Your starting budget is built from the last 12 months of authorized services plus unmet needs documented in the IPP, so document needs BEFORE converting.',
      'En lugar de que el Centro Regional compre servicios autorización por autorización, los servicios de su hijo/a pueden convertirse en un presupuesto anual que su familia dirige. Casi todos los niños del Centro Regional califican — solo ~1.5% está inscrito. Su presupuesto inicial se basa en los últimos 12 meses de servicios autorizados más las necesidades documentadas en el IPP, así que documente las necesidades ANTES de cambiar.',
      'Thay vì Trung tâm Khu vực mua dịch vụ theo từng giấy ủy quyền, dịch vụ của con quý vị có thể trở thành ngân sách hằng năm do gia đình điều hành. Hầu hết trẻ của Trung tâm Khu vực đều đủ điều kiện — chỉ ~1.5% ghi danh. Ngân sách khởi điểm dựa trên 12 tháng dịch vụ đã duyệt gần nhất cộng với nhu cầu chưa đáp ứng có ghi trong IPP, vì vậy hãy ghi nhận nhu cầu TRƯỚC KHI chuyển đổi.'
    ),
    citation: 'W&I §4685.8 · DDS D-2026-SDP-002',
    clock: L(
      'No enforceable clock on enrollment — typically 3–12 months. The 30-day IPP-meeting rule is your lever at every step.',
      'La inscripción no tiene plazo obligatorio — típicamente 3–12 meses. La regla de la reunión de 30 días es su herramienta en cada paso.',
      'Ghi danh không có thời hạn bắt buộc — thường 3–12 tháng. Quy tắc họp IPP 30 ngày là công cụ của quý vị ở mỗi bước.'
    ),
    leverTemplate: 'sdp_info_request',
    leverLabel: L(
      'Ask about Self-Determination in writing',
      'Preguntar por la Autodeterminación por escrito',
      'Hỏi về Tự quyết bằng văn bản'
    ),
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

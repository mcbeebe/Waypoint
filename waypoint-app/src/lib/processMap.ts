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
import type { RcStatus, IepStatus } from '@/types/database';
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
        'Request the written Notice of Action',
        'Solicitar la Notificación de Acción por escrito',
        'Yêu cầu Thông báo Hành động bằng văn bản'
      ),
      actionKeys: [],
    },
  ];
}

/**
 * The school-system spine (IDEA / CA Ed Code) — same shape as the RC
 * stages so ProcessMapScreen renders either system, clearly labeled.
 */
export function getSchoolStages(locale: FunnelLocale = 'en'): ProcessStage[] {
  const L = picker(locale);
  return [
    {
      key: 'school_referral',
      title: L(
        'Ask for an evaluation — in writing',
        'Pida una evaluación — por escrito',
        'Yêu cầu đánh giá — bằng văn bản'
      ),
      body: L(
        'A written special-education evaluation request starts a legal clock; a verbal ask starts nothing. The district must respond with an assessment plan for you to sign.',
        'Una solicitud escrita de evaluación de educación especial inicia un plazo legal; pedirlo de palabra no inicia nada. El distrito debe responder con un plan de evaluación para su firma.',
        'Yêu cầu đánh giá giáo dục đặc biệt bằng văn bản khởi động thời hạn pháp lý; nói miệng thì không. Học khu phải trả lời bằng kế hoạch đánh giá để quý vị ký.'
      ),
      citation: 'Ed Code §56321',
      clock: L(
        'Assessment plan due within 15 calendar days of your written request (school breaks over 5 school days pause the clock).',
        'Plan de evaluación dentro de 15 días calendario desde su solicitud escrita (las vacaciones escolares de más de 5 días escolares pausan el plazo).',
        'Kế hoạch đánh giá phải có trong 15 ngày dương lịch kể từ yêu cầu bằng văn bản (kỳ nghỉ học trên 5 ngày học sẽ tạm dừng thời hạn).'
      ),
      leverTemplate: 'assessment_request',
      leverLabel: L(
        'Draft the evaluation request (15-day clock)',
        'Redactar la solicitud de evaluación (plazo de 15 días)',
        'Soạn yêu cầu đánh giá (thời hạn 15 ngày)'
      ),
      actionKeys: ['iep_request_evaluation', 'iep_504_request', 'sli_iep_evaluation'],
    },
    {
      key: 'school_assessment',
      title: L(
        'Sign the plan; the assessment runs',
        'Firme el plan; corre la evaluación',
        'Ký kế hoạch; đánh giá được tiến hành'
      ),
      body: L(
        'You have at least 15 days to review and sign the plan — but the 60-day clock starts at your signature, so sign promptly and keep the date. The district must then assess in every area of suspected disability and hold the IEP meeting.',
        'Usted tiene al menos 15 días para revisar y firmar el plan — pero el plazo de 60 días empieza con su firma, así que firme pronto y guarde la fecha. El distrito debe entonces evaluar en cada área de posible discapacidad y realizar la reunión del IEP.',
        'Quý vị có ít nhất 15 ngày để xem và ký kế hoạch — nhưng thời hạn 60 ngày tính từ chữ ký, nên hãy ký sớm và giữ lại ngày ký. Học khu sau đó phải đánh giá mọi lĩnh vực nghi ngờ khuyết tật và tổ chức họp IEP.'
      ),
      citation: 'Ed Code §56321 · §56344',
      clock: L(
        '60 days from signed consent to a completed evaluation and the IEP meeting (long school breaks pause the clock).',
        '60 días desde el consentimiento firmado hasta la evaluación completa y la reunión del IEP (las vacaciones escolares largas pausan el plazo).',
        '60 ngày từ khi ký đồng ý đến khi đánh giá xong và họp IEP (kỳ nghỉ học dài sẽ tạm dừng thời hạn).'
      ),
      leverTemplate: 'iep_email',
      leverLabel: L(
        'Follow up on the 60-day clock',
        'Dar seguimiento al plazo de 60 días',
        'Theo dõi thời hạn 60 ngày'
      ),
      actionKeys: [],
    },
    {
      key: 'school_iep',
      title: L(
        'The IEP — where every service starts',
        'El IEP — donde empieza cada servicio',
        'IEP — nơi mọi dịch vụ bắt đầu'
      ),
      body: L(
        'The IEP lists the services, minutes, and placement the district must deliver. It is reviewed at least annually — and you can request an IEP team meeting at any time, in writing.',
        'El IEP enumera los servicios, minutos y colocación que el distrito debe proveer. Se revisa al menos una vez al año — y usted puede pedir una reunión del equipo del IEP en cualquier momento, por escrito.',
        'IEP liệt kê dịch vụ, số phút và việc xếp lớp mà học khu phải cung cấp. IEP được xem xét ít nhất mỗi năm — và quý vị có thể yêu cầu họp nhóm IEP bất cứ lúc nào, bằng văn bản.'
      ),
      citation: 'Ed Code §56343.5',
      clock: L(
        'A requested IEP meeting: held within 30 days of your written request (school vacation days don’t count).',
        'Reunión del IEP solicitada: dentro de 30 días de su solicitud escrita (los días de vacaciones escolares no cuentan).',
        'Họp IEP theo yêu cầu: trong 30 ngày kể từ yêu cầu bằng văn bản (ngày nghỉ học không tính).'
      ),
      leverTemplate: 'iep_email',
      leverLabel: L(
        'Request an IEP meeting (30-day clock)',
        'Pedir una reunión del IEP (plazo de 30 días)',
        'Yêu cầu họp IEP (thời hạn 30 ngày)'
      ),
      actionKeys: ['iep_request_meeting'],
    },
    {
      key: 'school_services',
      title: L(
        'Services get delivered — or refused',
        'Los servicios se entregan — o se niegan',
        'Dịch vụ được cung cấp — hoặc bị từ chối'
      ),
      body: L(
        'A refusal to evaluate, place, or serve must come as Prior Written Notice explaining why — a verbal "no" is not a decision. And your child\'s full school file is yours on request.',
        'Una negativa a evaluar, colocar o proveer servicios debe llegar como Notificación Previa por Escrito explicando por qué — un "no" verbal no es una decisión. Y el expediente escolar completo de su hijo/a es suyo si lo pide.',
        'Từ chối đánh giá, xếp lớp hay cung cấp dịch vụ phải bằng Thông báo Trước bằng Văn bản nêu lý do — lời từ chối miệng không phải là quyết định. Và toàn bộ hồ sơ học đường của con thuộc về quý vị khi yêu cầu.'
      ),
      citation: 'Ed Code §56500.4 · §56504',
      clock: L(
        'Records: within 5 business days of your request. Refusals: Prior Written Notice required.',
        'Registros: dentro de 5 días hábiles de su solicitud. Negativas: se requiere Notificación Previa por Escrito.',
        'Hồ sơ: trong 5 ngày làm việc kể từ yêu cầu. Từ chối: bắt buộc có Thông báo Trước bằng Văn bản.'
      ),
      leverTemplate: 'pwn_request',
      leverLabel: L(
        'Request Prior Written Notice',
        'Solicitar Notificación Previa por Escrito',
        'Yêu cầu Thông báo Trước bằng Văn bản'
      ),
      actionKeys: [],
    },
    {
      key: 'school_disagree',
      title: L(
        'Disagree? You have real leverage',
        '¿No está de acuerdo? Tiene herramientas reales',
        'Không đồng ý? Quý vị có công cụ thực sự'
      ),
      body: L(
        "If you disagree with the district's assessment, you can request an independent educational evaluation (IEE) at public expense — the district must pay for it or defend its own assessment at a hearing. For legal violations there's a state compliance complaint, and for placement or service disputes, mediation and due process.",
        'Si no está de acuerdo con la evaluación del distrito, puede pedir una evaluación educativa independiente (IEE) pagada con fondos públicos — el distrito debe pagarla o defender su propia evaluación en una audiencia. Para violaciones legales existe la queja estatal de cumplimiento, y para disputas de colocación o servicios, la mediación y el debido proceso.',
        'Nếu không đồng ý với đánh giá của học khu, quý vị có thể yêu cầu đánh giá giáo dục độc lập (IEE) bằng công quỹ — học khu phải trả chi phí hoặc bảo vệ đánh giá của mình tại phiên điều trần. Với vi phạm pháp luật có đơn khiếu nại tuân thủ cấp tiểu bang, và với tranh chấp xếp lớp hay dịch vụ, có hòa giải và thủ tục tố tụng.'
      ),
      citation: 'Ed Code §56329(b) · §56501',
      clock: L(
        'No clock on you — but the district must answer an IEE request "without unnecessary delay."',
        'Usted no tiene plazo — pero el distrito debe responder a una solicitud de IEE "sin demora innecesaria".',
        'Quý vị không bị giới hạn thời gian — nhưng học khu phải trả lời yêu cầu IEE "không chậm trễ vô lý".'
      ),
      leverTemplate: 'cde_complaint',
      leverLabel: L(
        'Draft a state compliance complaint',
        'Redactar una queja estatal de cumplimiento',
        'Soạn đơn khiếu nại tuân thủ cấp tiểu bang'
      ),
      actionKeys: [],
    },
  ];
}

/**
 * "You are here" for the school system, from the child's IEP status
 * captured at onboarding (children.iep_status).
 */
export function deriveSchoolStageIndex(iepStatus: IepStatus | null | undefined): number {
  switch (iepStatus) {
    case 'eval_done':
      return 2; // evaluated — the IEP meeting/document is the live stage
    case 'active':
      return 3; // IEP in place — delivery and disagreements matter now
    case 'no':
    case 'unknown':
    case 'na':
    default:
      return 0; // not yet referred
  }
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
export const SCHOOL_STAGES: ProcessStage[] = getSchoolStages('en');

/**
 * Where "you are here" points, from the child's Regional Center status
 * captured at onboarding (children.rc_status). A family that has confirmed
 * an IPP is on file (children.has_ipp) is past the IPP stage — services
 * and authorizations are the live concern.
 */
export function deriveStageIndex(
  rcStatus: RcStatus | null | undefined,
  hasIpp?: boolean | null
): number {
  switch (rcStatus) {
    case 'applied':
      return 1; // waiting on assessment/eligibility — the §4643 clock matters now
    case 'active':
      return hasIpp ? 3 : 2; // IPP confirmed → services; else the meeting lever matters now
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

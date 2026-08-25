/**
 * The family-facing SDP enrollment journey — steps 0–8, current as of DDS
 * directive D-2026-SelfDeterminationProgram-002 (issued Mar 24, 2026,
 * effective Apr 1, 2026): SDP orientation is two required 2-hour sessions
 * delivered ONLY by SCDD (Part A before Part B, certificate after each),
 * and handing both certificates to the service coordinator triggers a
 * mandatory four-item hand-off.
 *
 * Step 0 is prep, not enrollment — the directive-defined sequence is 8
 * steps, so progress reads "Step N of 8" while nine cards render. Pure
 * data + derivation, no I/O. Trilingual like the other funnel modules;
 * citations stay English; ES/VI are careful drafts flagged for
 * native-speaker review.
 *
 * Distinct from sdpStages.ts, which models the FACILITATOR's case
 * pipeline; this module is the parent's map of the whole enrollment.
 */
import type { FunnelLocale } from '@/lib/eligibility';

export type SdpJourneyStepKey =
  | 'fix_ipp'
  | 'orientation'
  | 'certificates'
  | 'pcp_facilitator'
  | 'fms'
  | 'budget'
  | 'spending_plan'
  | 'medi_cal_waiver'
  | 'live';

export interface SdpJourneyStep {
  key: SdpJourneyStepKey;
  /** Display number 0–8 ("of 8" — step 0 is prep). */
  n: number;
  title: string;
  /** Plain-language body, ~7th-grade reading level. */
  body: string;
  /** What the family gets at this step ('' when the step is pure prep). */
  youGet: string;
  citation: string;
  /** Letter template (lettersCatalog) that pulls the lever at this step. */
  leverTemplate: string | null;
  leverLabel: string | null;
  /** Sub-items rendered as a checklist (Part A/B, the 4 hand-off items). */
  checklist: string[];
}

export type SdpStepStatus = 'done' | 'current' | 'upcoming';

export interface DerivedSdpJourney {
  steps: Array<SdpJourneyStep & { status: SdpStepStatus }>;
  /** Index into steps of the current step. */
  currentIndex: number;
  /** 0–100, from the "of 8" framing (step 0 contributes nothing). */
  progressPct: number;
}

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

/** The nine step cards, in order. */
export function getSdpJourneySteps(locale: FunnelLocale = 'en'): SdpJourneyStep[] {
  const L = picker(locale);
  return [
    {
      key: 'fix_ipp',
      n: 0,
      title: L('Fix the IPP first', 'Primero arregle el IPP', 'Sửa IPP trước tiên'),
      body: L(
        'Your budget will be based on the last 12 months of Regional Center spending — plus needs documented in the IPP. Get unmet needs written in and authorized BEFORE anyone calculates a number.',
        'Su presupuesto se basará en los últimos 12 meses de gastos del Centro Regional — más las necesidades documentadas en el IPP. Haga que las necesidades no cubiertas queden escritas y autorizadas ANTES de que alguien calcule una cifra.',
        'Ngân sách sẽ dựa trên 12 tháng chi tiêu gần nhất của Trung tâm Khu vực — cộng với nhu cầu ghi trong IPP. Hãy đưa nhu cầu chưa đáp ứng vào IPP và được duyệt TRƯỚC KHI ai đó tính con số.'
      ),
      youGet: L(
        'A budget basis that reflects real needs, not a low year of spending.',
        'Una base de presupuesto que refleja necesidades reales, no un año de gasto bajo.',
        'Cơ sở ngân sách phản ánh nhu cầu thật, không phải một năm chi tiêu thấp.'
      ),
      citation: 'W&I §4685.8 · §4646.5(b)',
      leverTemplate: 'ipp_review_request',
      leverLabel: L(
        'Request the IPP meeting (30-day clock)',
        'Pedir la reunión del IPP (plazo de 30 días)',
        'Yêu cầu họp IPP (thời hạn 30 ngày)'
      ),
      checklist: [],
    },
    {
      key: 'orientation',
      n: 1,
      title: L(
        'Orientation — two parts, SCDD only',
        'Orientación — dos partes, solo SCDD',
        'Định hướng — hai phần, chỉ qua SCDD'
      ),
      body: L(
        'Two required 2-hour virtual sessions. For a minor, the parent or guardian attends. SCDD is the only approved provider statewide — orientations from anyone else do not count. Offered in 12 languages, including Spanish and Vietnamese.',
        'Dos sesiones virtuales obligatorias de 2 horas. Para un menor, asiste el padre, madre o tutor. SCDD es el único proveedor aprobado en todo el estado — las orientaciones de cualquier otra entidad no cuentan. Se ofrece en 12 idiomas, incluidos español y vietnamita.',
        'Hai buổi học trực tuyến bắt buộc, mỗi buổi 2 giờ. Với trẻ vị thành niên, cha mẹ hoặc người giám hộ tham dự. SCDD là đơn vị duy nhất được phê duyệt toàn tiểu bang — định hướng từ nơi khác không được tính. Có 12 ngôn ngữ, gồm tiếng Tây Ban Nha và tiếng Việt.'
      ),
      youGet: L(
        'A Certificate of Completion after each part — both are your enrollment keys.',
        'Un Certificado de Finalización después de cada parte — ambos son sus llaves de inscripción.',
        'Giấy Chứng nhận Hoàn thành sau mỗi phần — cả hai là chìa khóa ghi danh.'
      ),
      citation: 'DDS D-2026-SDP-002',
      leverTemplate: 'sdp_info_request',
      leverLabel: L(
        'Ask your coordinator for the registration steps',
        'Pida a su coordinador/a los pasos de registro',
        'Hỏi điều phối viên các bước đăng ký'
      ),
      checklist: [
        L('Part A (must come first)', 'Parte A (debe ser primero)', 'Phần A (phải học trước)'),
        L('Part B', 'Parte B', 'Phần B'),
      ],
    },
    {
      key: 'certificates',
      n: 2,
      title: L(
        'Hand in both certificates',
        'Entregue ambos certificados',
        'Nộp cả hai giấy chứng nhận'
      ),
      body: L(
        'Give both certificates to your service coordinator. The hand-off is mandatory — they must respond with four things. Ask for all four in writing.',
        'Entregue ambos certificados a su coordinador/a de servicios. La entrega es obligatoria — deben responder con cuatro cosas. Pida las cuatro por escrito.',
        'Nộp cả hai giấy chứng nhận cho điều phối viên dịch vụ. Việc bàn giao là bắt buộc — họ phải phản hồi bằng bốn thứ. Hãy yêu cầu cả bốn bằng văn bản.'
      ),
      youGet: L(
        'The four hand-off items — your working file for everything that follows.',
        'Los cuatro elementos de la entrega — su expediente de trabajo para todo lo que sigue.',
        'Bốn mục bàn giao — hồ sơ làm việc cho mọi bước tiếp theo.'
      ),
      citation: 'DDS D-2026-SDP-002',
      leverTemplate: 'sdp_info_request',
      leverLabel: L(
        'Send the 4-item request letter',
        'Enviar la carta de los 4 elementos',
        'Gửi thư yêu cầu 4 mục'
      ),
      checklist: [
        L('A copy of the most recent IPP', 'Una copia del IPP más reciente', 'Bản sao IPP mới nhất'),
        L('SDP transition supports info', 'Información sobre apoyos de transición del SDP', 'Thông tin hỗ trợ chuyển tiếp SDP'),
        L('FMS (money manager) info', 'Información sobre el FMS (administrador de fondos)', 'Thông tin FMS (đơn vị quản lý tiền)'),
        L('The steps to start the budget process', 'Los pasos para iniciar el proceso del presupuesto', 'Các bước bắt đầu quy trình ngân sách'),
      ],
    },
    {
      key: 'pcp_facilitator',
      n: 3,
      title: L(
        'Person-centered plan + facilitator',
        'Plan centrado en la persona + facilitador',
        'Kế hoạch lấy con làm trung tâm + người hỗ trợ'
      ),
      body: L(
        'Both are optional — but funded. The Regional Center pays for initial person-centered planning and for transition-period facilitation help. For a first-time transition, take the funded help.',
        'Ambos son opcionales — pero financiados. El Centro Regional paga la planificación centrada en la persona inicial y la ayuda de facilitación durante la transición. Para una primera transición, acepte la ayuda financiada.',
        'Cả hai đều tùy chọn — nhưng được tài trợ. Trung tâm Khu vực trả chi phí lập kế hoạch ban đầu và hỗ trợ chuyển tiếp. Nếu là lần đầu chuyển đổi, hãy nhận sự trợ giúp được tài trợ này.'
      ),
      youGet: L(
        'Up to $1,000 for the plan and up to 40 hours of transition support — RC-paid, not from your budget.',
        'Hasta $1,000 para el plan y hasta 40 horas de apoyo de transición — pagados por el Centro Regional, no de su presupuesto.',
        'Đến $1,000 cho kế hoạch và đến 40 giờ hỗ trợ chuyển tiếp — do Trung tâm Khu vực trả, không trừ vào ngân sách.'
      ),
      citation: L(
        'codes 024 + 099 · July 2024 DDS guidance',
        'codes 024 + 099 · July 2024 DDS guidance',
        'codes 024 + 099 · July 2024 DDS guidance'
      ),
      leverTemplate: null,
      leverLabel: null,
      checklist: [],
    },
    {
      key: 'fms',
      n: 4,
      title: L('Choose your FMS', 'Elija su FMS', 'Chọn FMS của quý vị'),
      body: L(
        'The FMS is the only required vendor. It pays providers directly, handles hiring paperwork, background checks, and taxes — and the Regional Center pays for it OUTSIDE your budget. Interview a few before choosing.',
        'El FMS es el único proveedor obligatorio. Paga a los proveedores directamente, maneja los trámites de contratación, verificaciones de antecedentes e impuestos — y el Centro Regional lo paga FUERA de su presupuesto. Entreviste a varios antes de elegir.',
        'FMS là nhà cung cấp bắt buộc duy nhất. FMS trả tiền trực tiếp cho nhà cung cấp, lo giấy tờ tuyển dụng, kiểm tra lý lịch và thuế — và Trung tâm Khu vực trả phí này NGOÀI ngân sách của quý vị. Hãy phỏng vấn vài nơi trước khi chọn.'
      ),
      youGet: L(
        'A money manager at no cost to your budget, plus a monthly spending report.',
        'Un administrador de fondos sin costo para su presupuesto, más un informe mensual de gastos.',
        'Một đơn vị quản lý tiền không tốn ngân sách, kèm báo cáo chi tiêu hằng tháng.'
      ),
      citation: L(
        'three models: Bill Payer · Sole Employer · Co-Employer',
        'three models: Bill Payer · Sole Employer · Co-Employer',
        'three models: Bill Payer · Sole Employer · Co-Employer'
      ),
      leverTemplate: null,
      leverLabel: null,
      checklist: [],
    },
    {
      key: 'budget',
      n: 5,
      title: L(
        'IPP meeting sets the budget',
        'La reunión del IPP fija el presupuesto',
        'Họp IPP ấn định ngân sách'
      ),
      body: L(
        "The IPP team determines the annual number — built from step 0's work. It cannot exceed what services would cost in the traditional system, and enrolling does not reduce it. If the team disagrees about an increase, you have the same appeal and fair-hearing rights as always.",
        'El equipo del IPP determina la cifra anual — construida a partir del trabajo del paso 0. No puede exceder lo que costarían los servicios en el sistema tradicional, e inscribirse no la reduce. Si el equipo no está de acuerdo con un aumento, usted tiene los mismos derechos de apelación y audiencia justa de siempre.',
        'Nhóm IPP quyết định con số hằng năm — dựa trên công sức ở bước 0. Con số không thể vượt chi phí dịch vụ trong hệ thống truyền thống, và việc ghi danh không làm giảm nó. Nếu nhóm không đồng ý tăng, quý vị vẫn có đầy đủ quyền kháng cáo và điều trần công bằng.'
      ),
      youGet: L(
        'A certified annual budget your family will direct.',
        'Un presupuesto anual certificado que su familia dirigirá.',
        'Một ngân sách hằng năm được chứng nhận do gia đình điều hành.'
      ),
      citation: 'W&I §4685.8',
      leverTemplate: 'ipp_review_request',
      leverLabel: L(
        'Request the budget IPP meeting',
        'Pedir la reunión del IPP para el presupuesto',
        'Yêu cầu họp IPP về ngân sách'
      ),
      checklist: [],
    },
    {
      key: 'spending_plan',
      n: 6,
      title: L(
        'Write the spending plan',
        'Escriba el plan de gastos',
        'Viết kế hoạch chi tiêu'
      ),
      body: L(
        "You write it — services, frequency, cost — and the Regional Center certifies it. One legal constraint shapes everything: it cannot buy anything available from IHSS, Medi-Cal, or the school district. Secure those layers first and build the plan around the gaps.",
        'Usted lo escribe — servicios, frecuencia, costo — y el Centro Regional lo certifica. Una restricción legal lo define todo: no puede comprar nada disponible a través de IHSS, Medi-Cal o el distrito escolar. Asegure esas capas primero y construya el plan alrededor de los vacíos.',
        'Quý vị tự viết — dịch vụ, tần suất, chi phí — và Trung tâm Khu vực chứng nhận. Một ràng buộc pháp lý chi phối tất cả: không được mua thứ gì đã có qua IHSS, Medi-Cal, hoặc học khu. Hãy bảo đảm các tầng đó trước rồi xây kế hoạch quanh những khoảng trống.'
      ),
      youGet: L(
        'Control over what the budget buys, with your provider choices respected.',
        'Control sobre lo que compra el presupuesto, con sus elecciones de proveedores respetadas.',
        'Quyền quyết định ngân sách mua gì, và lựa chọn nhà cung cấp của quý vị được tôn trọng.'
      ),
      citation: 'W&I §4685.8',
      leverTemplate: null,
      leverLabel: null,
      checklist: [],
    },
    {
      key: 'medi_cal_waiver',
      n: 7,
      title: L(
        'Medi-Cal + SDP waiver enrollment',
        'Inscripción en Medi-Cal + exención del SDP',
        'Ghi danh Medi-Cal + miễn trừ SDP'
      ),
      body: L(
        'This runs in parallel, not after: Medi-Cal plus the SDP waiver is how federal dollars match your budget. Institutional deeming lets your child qualify without counting parent income.',
        'Esto corre en paralelo, no después: Medi-Cal más la exención del SDP es la forma en que los dólares federales igualan su presupuesto. La consideración institucional permite que su hijo/a califique sin contar los ingresos de los padres.',
        'Bước này chạy song song, không phải sau cùng: Medi-Cal cộng miễn trừ SDP là cách tiền liên bang khớp với ngân sách. Cơ chế "institutional deeming" giúp con đủ điều kiện mà không tính thu nhập cha mẹ.'
      ),
      youGet: L(
        'Federal funding behind the budget — and the door to IHSS hours.',
        'Financiamiento federal detrás del presupuesto — y la puerta a las horas de IHSS.',
        'Nguồn tài trợ liên bang cho ngân sách — và cánh cửa đến giờ chăm sóc IHSS.'
      ),
      citation: 'W&I §4685.8(u)',
      leverTemplate: 'rc_request',
      leverLabel: L(
        'Ask for institutional deeming by name',
        'Pida la consideración institucional por su nombre',
        'Yêu cầu đích danh "institutional deeming"'
      ),
      checklist: [],
    },
    {
      key: 'live',
      n: 8,
      title: L('Live in it', 'Viva el programa', 'Sống với chương trình'),
      body: L(
        'Providers do not have to be RC-vendored — hire your own staff or negotiate with local businesses. The FMS sends monthly reports on what is allocated, spent, and remaining. Enrollment is voluntary and you can leave SDP at any time.',
        'Los proveedores no tienen que estar registrados con el Centro Regional — contrate su propio personal o negocie con negocios locales. El FMS envía informes mensuales de lo asignado, gastado y restante. La inscripción es voluntaria y puede dejar el SDP en cualquier momento.',
        'Nhà cung cấp không cần đăng ký với Trung tâm Khu vực — quý vị có thể tự thuê người hoặc thương lượng với cơ sở địa phương. FMS gửi báo cáo hằng tháng về số đã cấp, đã chi và còn lại. Ghi danh là tự nguyện và quý vị có thể rời SDP bất cứ lúc nào.'
      ),
      youGet: L(
        'Services shaped by your family — with the paper trail handled.',
        'Servicios a la medida de su familia — con el papeleo resuelto.',
        'Dịch vụ theo đúng nhu cầu gia đình — giấy tờ đã có người lo.'
      ),
      citation: 'W&I §4685.8',
      leverTemplate: null,
      leverLabel: null,
      checklist: [],
    },
  ];
}

/** Total enrollment steps in the "of 8" framing (step 0 is prep). */
export const SDP_JOURNEY_TOTAL = 8;

/**
 * Derive the journey view from the family's current step (children.sdp_step;
 * null/undefined = not started, i.e. step 0 is current). Values are clamped
 * to 0–8 so bad data can't render an impossible journey.
 */
export function deriveSdpJourney(
  sdpStep: number | null | undefined,
  locale: FunnelLocale = 'en'
): DerivedSdpJourney {
  const current = Math.min(Math.max(sdpStep ?? 0, 0), SDP_JOURNEY_TOTAL);
  const steps = getSdpJourneySteps(locale).map((s) => ({
    ...s,
    status: (s.n < current ? 'done' : s.n === current ? 'current' : 'upcoming') as SdpStepStatus,
  }));
  return {
    steps,
    currentIndex: steps.findIndex((s) => s.status === 'current'),
    progressPct: Math.round((current / SDP_JOURNEY_TOTAL) * 100),
  };
}

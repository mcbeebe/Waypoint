/**
 * The Resource Stack — Waypoint's core mental model: California benefits
 * for a disabled child are a stack of six layers in dependency order,
 * each funding different things and each unlocking or protecting the
 * next. The order is legal strategy, not preference: an SDP spending
 * plan cannot buy what school, Medi-Cal, or IHSS must already provide
 * (generic services first, W&I §4685.8), so lower layers make the budget
 * go further.
 *
 * Pure data + derivation, no I/O. Trilingual like the other funnel
 * modules; citations stay English; ES/VI are careful drafts flagged for
 * native-speaker review. Value claims stay honest — no invented dollar
 * averages.
 */
import type { RcStatus, IepStatus, BenefitStatus } from '@/types/database';
import type { FunnelLocale } from '@/lib/eligibility';

export type { BenefitStatus };

export type StackLayerKey =
  | 'school'
  | 'regional_center'
  | 'medi_cal'
  | 'ihss'
  | 'sdp'
  | 'ssi';

export type StackLayerStatus =
  /** In place — this layer is working for the family. */
  | 'secured'
  /** Applied / mid-journey — the wheels are turning. */
  | 'in_progress'
  /** Nothing blocks it; the family can act on it now. */
  | 'available'
  /** Blocked until the layer named in lockedBy is secured. */
  | 'locked'
  /** Not applicable yet (age) or family reported not eligible. */
  | 'later';

export interface StackLayer {
  key: StackLayerKey;
  /** Position in the stack, 1 = foundation. */
  n: number;
  title: string;
  /** What this layer gets the family, honestly framed. */
  gets: string;
  citation: string;
  status: StackLayerStatus;
  statusLabel: string;
  /** The layer gating this one when status is 'locked'. */
  lockedBy: StackLayerKey | null;
  /** Navigation lever that advances this layer (null when none applies). */
  lever: { screen: string; params?: Record<string, string> } | null;
}

export interface StackInput {
  ageYears: number | null;
  rcStatus: RcStatus | null | undefined;
  iepStatus: IepStatus | null | undefined;
  mediCalStatus?: BenefitStatus | null;
  ihssStatus?: BenefitStatus | null;
  ssiStatus?: BenefitStatus | null;
  /** children.sdp_step (0–8); null = not started. */
  sdpStep?: number | null;
}

export interface DerivedStack {
  /** Foundation first (n ascending). */
  layers: StackLayer[];
  securedCount: number;
  totalCount: number;
  /** The lowest available layer — the "next unlock" to highlight. */
  nextUnlock: StackLayer | null;
}

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

function statusLabelFor(status: StackLayerStatus, locale: FunnelLocale): string {
  const L = picker(locale);
  switch (status) {
    case 'secured':
      return L('Secured', 'Asegurado', 'Đã có');
    case 'in_progress':
      return L('In progress', 'En proceso', 'Đang tiến hành');
    case 'available':
      return L('Available now', 'Disponible ahora', 'Có thể làm ngay');
    case 'locked':
      return L('Locked', 'Bloqueado', 'Chưa mở khóa');
    case 'later':
      return L('Later', 'Más adelante', 'Sau này');
  }
}

/**
 * Derive the six layers with per-family statuses. Missing self-reported
 * statuses read as 'unknown', which derives the same as 'none' — the
 * stack invites the family to act rather than guessing they already did.
 */
export function deriveResourceStack(
  input: StackInput,
  locale: FunnelLocale = 'en'
): DerivedStack {
  const L = picker(locale);
  const { ageYears, rcStatus, iepStatus } = input;
  const mediCal = input.mediCalStatus ?? 'unknown';
  const ihss = input.ihssStatus ?? 'unknown';
  const ssi = input.ssiStatus ?? 'unknown';
  const sdpStep = input.sdpStep ?? null;

  const schoolAge = ageYears !== null && ageYears >= 3 && ageYears < 22;
  const schoolStatus: StackLayerStatus =
    iepStatus === 'active' || iepStatus === 'eval_done'
      ? 'secured'
      : iepStatus === 'na' || !schoolAge
        ? 'later'
        : 'available';

  const rcSecured = rcStatus === 'active';
  const rcLayerStatus: StackLayerStatus = rcSecured
    ? 'secured'
    : rcStatus === 'applied'
      ? 'in_progress'
      : 'available';

  const mediCalSecured = mediCal === 'active';
  const mediCalStatus: StackLayerStatus = mediCalSecured
    ? 'secured'
    : mediCal === 'applied'
      ? 'in_progress'
      : mediCal === 'not_eligible'
        ? 'later'
        : 'available';

  const ihssStatus: StackLayerStatus =
    ihss === 'active'
      ? 'secured'
      : ihss === 'applied'
        ? 'in_progress'
        : mediCalSecured
          ? 'available'
          : 'locked';

  const sdpStatus: StackLayerStatus =
    sdpStep !== null && sdpStep >= 8
      ? 'secured'
      : sdpStep !== null
        ? 'in_progress'
        : rcSecured
          ? 'available'
          : 'locked';

  const ssiLayerStatus: StackLayerStatus =
    ssi === 'active'
      ? 'secured'
      : ssi === 'applied'
        ? 'in_progress'
        : ageYears !== null && ageYears >= 18
          ? 'available'
          : 'later';

  const defs: Array<Omit<StackLayer, 'statusLabel'>> = [
    {
      key: 'school',
      n: 1,
      title: L('School (IEP)', 'Escuela (IEP)', 'Trường học (IEP)'),
      gets: L(
        'Therapies, aide support, and placement at no cost — a federal right from age 3 to 22.',
        'Terapias, apoyo de asistente y colocación sin costo — un derecho federal de los 3 a los 22 años.',
        'Trị liệu, trợ giảng và xếp lớp miễn phí — quyền liên bang từ 3 đến 22 tuổi.'
      ),
      citation: 'IDEA · Ed Code §56341',
      status: schoolStatus,
      lockedBy: null,
      lever: { screen: 'Letters', params: { template: 'assessment_request' } },
    },
    {
      key: 'regional_center',
      n: 2,
      title: L('Regional Center (IPP)', 'Centro Regional (IPP)', 'Trung tâm Khu vực (IPP)'),
      gets: L(
        'Respite, behavior support, and family services — no income test, no cost.',
        'Relevo, apoyo conductual y servicios familiares — sin requisito de ingresos, sin costo.',
        'Chăm sóc thay thế, hỗ trợ hành vi và dịch vụ gia đình — không xét thu nhập, không tốn phí.'
      ),
      citation: 'Lanterman Act, W&I §4512',
      status: rcLayerStatus,
      lockedBy: null,
      lever: { screen: 'ProcessMap' },
    },
    {
      key: 'medi_cal',
      n: 3,
      title: L(
        'Medi-Cal (institutional deeming)',
        'Medi-Cal (consideración institucional)',
        'Medi-Cal (institutional deeming)'
      ),
      gets: L(
        "Health coverage that ignores parent income — and the key that unlocks IHSS and federal SDP funding.",
        'Cobertura de salud que ignora los ingresos de los padres — y la llave que abre IHSS y el financiamiento federal del SDP.',
        'Bảo hiểm y tế không tính thu nhập cha mẹ — và chìa khóa mở IHSS cùng tài trợ liên bang cho SDP.'
      ),
      citation: 'HCBS waiver deeming',
      status: mediCalStatus,
      lockedBy: null,
      lever: { screen: 'Letters', params: { template: 'medi_cal_deeming' } },
    },
    {
      key: 'ihss',
      n: 4,
      title: L('IHSS paid care hours', 'Horas de cuidado pagadas (IHSS)', 'Giờ chăm sóc có trả lương (IHSS)'),
      gets: L(
        'Pays a caregiver — including you — for care hours, with protective supervision for many DD kids.',
        'Paga a un cuidador — incluida usted — por horas de cuidado, con supervisión protectora para muchos niños con discapacidades del desarrollo.',
        'Trả lương cho người chăm sóc — kể cả quý vị — theo giờ, kèm giám sát bảo vệ cho nhiều trẻ khuyết tật phát triển.'
      ),
      citation: 'W&I §12300',
      status: ihssStatus,
      lockedBy: ihssStatus === 'locked' ? 'medi_cal' : null,
      lever: { screen: 'Agencies' },
    },
    {
      key: 'sdp',
      n: 5,
      title: L(
        'Self-Determination budget',
        'Presupuesto de Autodeterminación',
        'Ngân sách Tự quyết'
      ),
      gets: L(
        "An annual budget you direct, spent on the gaps the layers below don't cover.",
        'Un presupuesto anual que usted dirige, gastado en los vacíos que las capas de abajo no cubren.',
        'Ngân sách hằng năm do quý vị điều hành, chi cho những khoảng trống các tầng dưới chưa phủ.'
      ),
      citation: 'W&I §4685.8 · DDS D-2026-SDP-002',
      status: sdpStatus,
      lockedBy: sdpStatus === 'locked' ? 'regional_center' : null,
      lever: { screen: 'SdpJourney' },
    },
    {
      key: 'ssi',
      n: 6,
      title: L('SSI cash benefit', 'Beneficio en efectivo SSI', 'Trợ cấp tiền mặt SSI'),
      gets: L(
        '$994/mo federal rate (2026) plus the CA supplement. Parent income stops counting the month after your child turns 18.',
        '$994/mes tarifa federal (2026) más el suplemento de CA. Los ingresos de los padres dejan de contar el mes después de que su hijo/a cumple 18.',
        '$994/tháng mức liên bang (2026) cộng phụ cấp CA. Thu nhập cha mẹ ngừng được tính vào tháng sau khi con tròn 18 tuổi.'
      ),
      citation: 'SSA 2026 COLA',
      status: ssiLayerStatus,
      lockedBy: null,
      lever: { screen: 'Agencies' },
    },
  ];

  const layers: StackLayer[] = defs.map((d) => ({
    ...d,
    statusLabel: statusLabelFor(d.status, locale),
  }));
  const securedCount = layers.filter((l) => l.status === 'secured').length;
  const nextUnlock = layers.find((l) => l.status === 'available') ?? null;
  return { layers, securedCount, totalCount: layers.length, nextUnlock };
}

/** Undivided-style unlock explainer: WHAT / WHY / HOW + a parent tip. */
export interface UnlockGuide {
  layerKey: StackLayerKey;
  title: string;
  what: string;
  why: string;
  how: string;
  tip: string;
  citation: string;
  leverTemplate: string;
  leverLabel: string;
}

/**
 * The deep-dive guide for the layers whose unlock is a concrete written
 * request (Medi-Cal deeming, then IHSS). Null for layers whose lever is a
 * whole screen rather than one request.
 */
export function unlockGuideFor(
  key: StackLayerKey,
  locale: FunnelLocale = 'en',
  childName?: string | null
): UnlockGuide | null {
  const L = picker(locale);
  const name = childName || L('your child', 'su hijo/a', 'con quý vị');
  switch (key) {
    case 'medi_cal':
      return {
        layerKey: 'medi_cal',
        title: L(
          'Medi-Cal without counting your income',
          'Medi-Cal sin contar sus ingresos',
          'Medi-Cal không tính thu nhập của quý vị'
        ),
        what: L(
          `"Institutional deeming" treats ${name}'s eligibility as if only their own income counted — most families over the normal limit qualify this way.`,
          `La "consideración institucional" trata la elegibilidad de ${name} como si solo contaran sus propios ingresos — la mayoría de las familias por encima del límite normal califica así.`,
          `"Institutional deeming" xét điều kiện của ${name} như thể chỉ tính thu nhập của chính con — hầu hết gia đình vượt mức bình thường đều đủ điều kiện theo cách này.`
        ),
        why: L(
          "It unlocks IHSS paid caregiving hours and federal matching for a future SDP budget — two layers of the stack.",
          'Abre las horas de cuidado pagadas de IHSS y el financiamiento federal para un futuro presupuesto del SDP — dos capas de la pila.',
          'Nó mở giờ chăm sóc có trả lương IHSS và nguồn đối ứng liên bang cho ngân sách SDP tương lai — hai tầng của chồng quyền lợi.'
        ),
        how: L(
          "One request to your Service Coordinator asks for it through the HCBS waiver. Waypoint drafts it and starts a follow-up clock.",
          'Una solicitud a su coordinador/a de servicios la pide a través de la exención HCBS. Waypoint la redacta e inicia un plazo de seguimiento.',
          'Một yêu cầu gửi điều phối viên dịch vụ, xin qua miễn trừ HCBS. Waypoint soạn thư và khởi động đồng hồ theo dõi.'
        ),
        tip: L(
          'Ask for it by name — "institutional deeming through the HCBS waiver." Coordinators rarely offer it unprompted.',
          'Pídala por su nombre — "consideración institucional a través de la exención HCBS". Los coordinadores rara vez la ofrecen sin que se la pidan.',
          'Hãy yêu cầu đích danh — "institutional deeming qua miễn trừ HCBS." Điều phối viên hiếm khi tự đề nghị.'
        ),
        citation: 'HCBS waiver deeming',
        leverTemplate: 'medi_cal_deeming',
        leverLabel: L('Draft the request →', 'Redactar la solicitud →', 'Soạn yêu cầu →'),
      };
    case 'ihss':
      return {
        layerKey: 'ihss',
        title: L(
          'IHSS: get paid for the care you already give',
          'IHSS: cobre por el cuidado que ya brinda',
          'IHSS: được trả lương cho việc chăm sóc quý vị vẫn đang làm'
        ),
        what: L(
          `IHSS pays a caregiver — including a parent — for ${name}'s care hours, and protective supervision adds hours for many developmental disabilities.`,
          `IHSS paga a un cuidador — incluido un padre o madre — por las horas de cuidado de ${name}, y la supervisión protectora agrega horas para muchas discapacidades del desarrollo.`,
          `IHSS trả lương cho người chăm sóc — kể cả cha mẹ — theo giờ chăm sóc của ${name}, và "giám sát bảo vệ" cộng thêm giờ cho nhiều khuyết tật phát triển.`
        ),
        why: L(
          "It's income for care you already give — and an SDP spending plan can't buy what IHSS covers, so having it makes a future budget go further.",
          'Es un ingreso por el cuidado que ya brinda — y un plan de gastos del SDP no puede comprar lo que IHSS cubre, así que tenerlo hace rendir más un presupuesto futuro.',
          'Đó là thu nhập cho việc chăm sóc quý vị vẫn đang làm — và kế hoạch chi tiêu SDP không được mua thứ IHSS đã phủ, nên có IHSS giúp ngân sách tương lai đi xa hơn.'
        ),
        how: L(
          'Apply at your county IHSS office (Medi-Cal must be active first). Ask for a protective-supervision assessment in the same application.',
          'Solicite en la oficina de IHSS de su condado (Medi-Cal debe estar activo primero). Pida una evaluación de supervisión protectora en la misma solicitud.',
          'Nộp đơn tại văn phòng IHSS của quận hạt (Medi-Cal phải có hiệu lực trước). Yêu cầu đánh giá "giám sát bảo vệ" ngay trong đơn.'
        ),
        tip: L(
          'Keep a one-week care diary before the home visit — assessors count what you can show, not what you remember.',
          'Lleve un diario de cuidado de una semana antes de la visita al hogar — los evaluadores cuentan lo que usted puede mostrar, no lo que recuerda.',
          'Ghi nhật ký chăm sóc một tuần trước buổi thăm nhà — người đánh giá tính những gì quý vị chứng minh được, không phải những gì quý vị nhớ.'
        ),
        citation: 'W&I §12300',
        leverTemplate: 'general',
        leverLabel: L('Plan the application →', 'Planear la solicitud →', 'Lên kế hoạch nộp đơn →'),
      };
    default:
      return null;
  }
}

/** The Home "Waypoint noticed" stack insight (mockup Concept C). */
export interface StackInsight {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  /** Bar states in layer order, for the mini visualization. */
  bars: Array<{ key: StackLayerKey; label: string; status: StackLayerStatus }>;
  securedCount: number;
  totalCount: number;
  guide: UnlockGuide;
  citation: string;
}

const BAR_LABELS: Record<StackLayerKey, Record<FunnelLocale, string>> = {
  school: { en: 'School', es: 'Escuela', vi: 'Trường' },
  regional_center: { en: 'RC', es: 'CR', vi: 'TTKV' },
  medi_cal: { en: 'Medi-Cal', es: 'Medi-Cal', vi: 'Medi-Cal' },
  ihss: { en: 'IHSS', es: 'IHSS', vi: 'IHSS' },
  sdp: { en: 'SDP', es: 'SDP', vi: 'SDP' },
  ssi: { en: 'SSI', es: 'SSI', vi: 'SSI' },
};

/**
 * Derive the Home stack insight — non-null only when the next unlock has a
 * deep-dive guide (Medi-Cal, IHSS), so the card never renders with a vague
 * ask. The generic insight card covers the other stories.
 */
export function deriveStackInsight(
  input: StackInput,
  locale: FunnelLocale = 'en',
  childName?: string | null
): StackInsight | null {
  const L = picker(locale);
  const stack = deriveResourceStack(input, locale);
  if (!stack.nextUnlock) return null;
  const guide = unlockGuideFor(stack.nextUnlock.key, locale, childName);
  if (!guide) return null;
  const name = childName || L('Your child', 'Su hijo/a', 'Con quý vị');
  return {
    eyebrow: L('WAYPOINT NOTICED', 'WAYPOINT NOTÓ', 'WAYPOINT NHẬN THẤY'),
    title: L(
      `${name} is using ${stack.securedCount} of ${stack.totalCount} benefit layers`,
      `${name} está usando ${stack.securedCount} de ${stack.totalCount} capas de beneficios`,
      `${name} đang dùng ${stack.securedCount} / ${stack.totalCount} tầng quyền lợi`
    ),
    body: L(
      `The next one is bigger than it looks: ${guide.title}. ${guide.why}`,
      `La siguiente es más grande de lo que parece: ${guide.title}. ${guide.why}`,
      `Tầng tiếp theo lớn hơn vẻ ngoài: ${guide.title}. ${guide.why}`
    ),
    ctaLabel: L('See the fastest unlock →', 'Ver el desbloqueo más rápido →', 'Xem cách mở nhanh nhất →'),
    bars: stack.layers.map((l) => ({
      key: l.key,
      label: BAR_LABELS[l.key][locale],
      status: l.status,
    })),
    securedCount: stack.securedCount,
    totalCount: stack.totalCount,
    guide,
    citation: guide.citation,
  };
}

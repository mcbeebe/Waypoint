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

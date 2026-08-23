/**
 * Eligibility derivation (PRD W-B: B1) — turns onboarding data into an
 * answer: what this child likely qualifies for, with the statute and a
 * review date on every card. Pure logic, no I/O.
 *
 * Honesty rules (from the mockup review): no dollar value we can't derive,
 * "likely eligible" vs "needs review" is never a false binary, and every
 * card carries its citation + last-reviewed date (content provenance).
 *
 * Trilingual (W1a ES parity; VI added with the localization pass): callers
 * pass the locale; each string is selected via L(en, es, vi). Legal
 * citations stay in English (same rule as the letters engine). Spanish and
 * Vietnamese are careful drafts — flag for native-speaker review before
 * wide release.
 */
import type { RcStatus, IepStatus } from '@/types/database';
import { SSI_FBR_MONTHLY, SSI_YEAR } from '@/data/benefitFigures';

export type EligibilityStatus = 'enrolled' | 'likely' | 'review' | 'later';
export type FunnelLocale = 'en' | 'es' | 'vi';

/** App locale (which may grow) → the funnel content locale. */
export function toFunnelLocale(locale: string): FunnelLocale {
  return locale === 'es' || locale === 'vi' ? locale : 'en';
}

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
  vi: {
    enrolled: 'Đã ghi danh ✓',
    likely: 'Có thể đủ điều kiện',
    review: 'Cần xem xét',
    later: 'Sau khi ghi danh',
    right: 'Quyền của quý vị',
  },
};

export function deriveEligibility(
  input: EligibilityInput,
  locale: FunnelLocale = 'en'
): EligibilityResult {
  const { ageYears, rcStatus, iepStatus, hasDiagnosis } = input;
  const cards: EligibilityCard[] = [];
  const SL = STATUS_LABELS[locale];
  const L = (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;

  // Early Start — under 3
  if (ageYears !== null && ageYears < 3) {
    cards.push({
      key: 'early_start',
      title: L('Early Start (ages 0–3)', 'Early Start (edades 0–3)', 'Early Start (0–3 tuổi)'),
      body: L(
        'Early intervention through your Regional Center — evaluations and services for infants and toddlers, at no cost.',
        'Intervención temprana a través de su Centro Regional — evaluaciones y servicios para bebés y niños pequeños, sin costo.',
        'Can thiệp sớm qua Trung tâm Khu vực (Regional Center) — đánh giá và dịch vụ cho trẻ sơ sinh và trẻ nhỏ, hoàn toàn miễn phí.'
      ),
      status: 'likely',
      statusLabel: SL.likely,
      factLabel: L('Who runs it', 'Quién lo administra', 'Ai phụ trách'),
      factValue: L(
        'Your Regional Center (IDEA Part C)',
        'Su Centro Regional (IDEA Parte C)',
        'Trung tâm Khu vực của quý vị (IDEA Phần C)'
      ),
      citation: 'IDEA Part C · Early Start',
      reviewedOn: REVIEWED,
    });
  }

  // Regional Center (Lanterman) — the anchor card
  if (rcStatus === 'active') {
    cards.push({
      key: 'regional_center',
      title: L('Regional Center services', 'Servicios del Centro Regional', 'Dịch vụ Trung tâm Khu vực'),
      body: L(
        'Your child is a Regional Center consumer. Services flow from the IPP — and you can request an IPP review meeting at any time (they must hold it within 30 days).',
        'Su hijo/a es consumidor del Centro Regional. Los servicios provienen del IPP — y usted puede pedir una reunión de revisión del IPP en cualquier momento (deben realizarla dentro de 30 días).',
        'Con quý vị là thân chủ của Trung tâm Khu vực. Dịch vụ dựa trên kế hoạch IPP — và quý vị có thể yêu cầu họp xem xét IPP bất cứ lúc nào (họ phải tổ chức trong vòng 30 ngày).'
      ),
      status: 'enrolled',
      statusLabel: SL.enrolled,
      factLabel: L('Your lever', 'Su herramienta', 'Công cụ của quý vị'),
      factValue: L(
        'IPP review meeting · 30 days',
        'Reunión de revisión del IPP · 30 días',
        'Họp xem xét IPP · 30 ngày'
      ),
      citation: 'W&I §4646.5(b)',
      reviewedOn: REVIEWED,
    });
  } else {
    cards.push({
      key: 'regional_center',
      title: L('Regional Center services', 'Servicios del Centro Regional', 'Dịch vụ Trung tâm Khu vực'),
      body: L(
        'Respite, behavior support, and family services under the Lanterman Act — no income test, no waiting list, no cost to families.',
        'Relevo (respite), apoyo conductual y servicios familiares bajo la Ley Lanterman — sin requisito de ingresos, sin lista de espera, sin costo para las familias.',
        'Chăm sóc thay thế (respite), hỗ trợ hành vi và dịch vụ gia đình theo Đạo luật Lanterman — không xét thu nhập, không danh sách chờ, không tốn phí cho gia đình.'
      ),
      status: hasDiagnosis ? 'likely' : 'review',
      statusLabel: hasDiagnosis ? SL.likely : SL.review,
      factLabel: L('Decision clock', 'Plazo de decisión', 'Thời hạn quyết định'),
      factValue: L(
        'Assessment ≤120 days from intake',
        'Evaluación ≤120 días desde la solicitud',
        'Đánh giá ≤120 ngày kể từ khi nộp đơn'
      ),
      citation: 'Lanterman Act, W&I §4512 · §4643',
      reviewedOn: REVIEWED,
    });
  }

  // SDP — only real once a consumer
  cards.push(
    rcStatus === 'active'
      ? {
          key: 'sdp',
          title: L(
            'Self-Determination Program',
            'Programa de Autodeterminación (SDP)',
            'Chương trình Tự quyết (SDP)'
          ),
          body: L(
            'Turn Regional Center services into an annual budget your family directs. Open to nearly every consumer — about 1.5% are enrolled, because families are rarely told.',
            'Convierta los servicios del Centro Regional en un presupuesto anual que su familia dirige. Abierto a casi todos los consumidores — solo ~1.5% está inscrito, porque rara vez se lo cuentan a las familias.',
            'Chuyển dịch vụ Trung tâm Khu vực thành ngân sách hằng năm do gia đình quý vị điều hành. Hầu hết thân chủ đều đủ điều kiện — chỉ ~1.5% ghi danh, vì ít gia đình được cho biết.'
          ),
          status: 'likely' as const,
          statusLabel: SL.likely,
          factLabel: L('Budget basis', 'Base del presupuesto', 'Cơ sở ngân sách'),
          factValue: L(
            'Last 12 months of authorized services + documented unmet needs',
            'Últimos 12 meses de servicios autorizados + necesidades documentadas',
            '12 tháng dịch vụ đã duyệt gần nhất + nhu cầu chưa đáp ứng có ghi nhận'
          ),
          citation: 'W&I §4685.8',
          reviewedOn: REVIEWED,
        }
      : {
          key: 'sdp',
          title: L(
            'Self-Determination Program',
            'Programa de Autodeterminación (SDP)',
            'Chương trình Tự quyết (SDP)'
          ),
          body: L(
            'Once your child is a Regional Center consumer, services can become a budget your family directs. One step at a time — Regional Center first.',
            'Cuando su hijo/a sea consumidor del Centro Regional, los servicios pueden convertirse en un presupuesto que su familia dirige. Paso a paso — primero el Centro Regional.',
            'Khi con quý vị trở thành thân chủ của Trung tâm Khu vực, dịch vụ có thể chuyển thành ngân sách do gia đình điều hành. Từng bước một — Trung tâm Khu vực trước.'
          ),
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
      title: L(
        'Special education evaluation (IEP)',
        'Evaluación de educación especial (IEP)',
        'Đánh giá giáo dục đặc biệt (IEP)'
      ),
      body: L(
        'A written request starts a legal clock: the district must give you an assessment plan within 15 calendar days.',
        'Una solicitud por escrito inicia un plazo legal: el distrito debe entregarle un plan de evaluación dentro de 15 días calendario.',
        'Một yêu cầu bằng văn bản khởi động thời hạn pháp lý: học khu phải đưa quý vị kế hoạch đánh giá trong vòng 15 ngày dương lịch.'
      ),
      status: 'likely',
      statusLabel: SL.right,
      factLabel: L('Clock', 'Plazo', 'Thời hạn'),
      factValue: L(
        '15 days to assessment plan · 60 days to complete',
        '15 días para el plan de evaluación · 60 días para completarla',
        '15 ngày cho kế hoạch đánh giá · 60 ngày để hoàn tất'
      ),
      citation: 'Ed Code §56321 · §56344',
      reviewedOn: REVIEWED,
    });
  }

  // SSI — always income-dependent, never a false promise
  cards.push({
    key: 'ssi',
    title: L(
      'Supplemental Security Income',
      'Seguridad de Ingreso Suplementario (SSI)',
      'Thu nhập An sinh Bổ sung (SSI)'
    ),
    body: L(
      "Monthly payments for a disabled child — depends on household income and it's not automatic, so we'd check with you.",
      'Pagos mensuales para un niño con discapacidad — depende de los ingresos del hogar y no es automático, así que lo revisaríamos con usted.',
      'Trợ cấp hằng tháng cho trẻ khuyết tật — tùy thu nhập gia đình và không tự động, nên chúng tôi sẽ xem xét cùng quý vị.'
    ),
    status: 'review',
    statusLabel: SL.review,
    factLabel: L(`${SSI_YEAR} federal rate`, `Tarifa federal ${SSI_YEAR}`, `Mức liên bang ${SSI_YEAR}`),
    factValue: L(
      `$${SSI_FBR_MONTHLY}/mo + CA supplement`,
      `$${SSI_FBR_MONTHLY}/mes + suplemento de CA`,
      `$${SSI_FBR_MONTHLY}/tháng + phụ cấp CA`
    ),
    citation: `SSA ${SSI_YEAR} COLA`,
    reviewedOn: REVIEWED,
  });

  // IHSS — income-independent for the child, but assessment-dependent
  cards.push({
    key: 'ihss',
    title: L(
      'In-Home Supportive Services',
      'Servicios de Apoyo en el Hogar (IHSS)',
      'Dịch vụ Hỗ trợ Tại nhà (IHSS)'
    ),
    body: L(
      'Paid hours for in-home care — a parent can be the paid provider. Depends on Medi-Cal and an assessed need.',
      'Horas pagadas de cuidado en el hogar — un padre o madre puede ser el proveedor pagado. Depende de Medi-Cal y de una necesidad evaluada.',
      'Giờ chăm sóc tại nhà được trả lương — cha mẹ có thể là người chăm sóc được trả lương. Tùy thuộc Medi-Cal và nhu cầu được đánh giá.'
    ),
    status: 'review',
    statusLabel: SL.review,
    factLabel: L('Who can be paid', 'Quién puede recibir pago', 'Ai có thể được trả lương'),
    factValue: L(
      'A parent caregiver, in many cases',
      'Un padre o madre cuidador/a, en muchos casos',
      'Cha mẹ chăm sóc, trong nhiều trường hợp'
    ),
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

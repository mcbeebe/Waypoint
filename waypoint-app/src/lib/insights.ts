/**
 * Home insights — "Waypoint noticed" (elevating the paths families are
 * never told about). One derivation, one card: the single highest-leverage
 * thing this family's profile says they are entitled to but not using.
 * Pure logic, no I/O; EN + ES like the rest of the funnel modules.
 *
 * Priority order is deliberate: the SDP fork outranks everything for
 * active consumers (near-universal eligibility, ~1.5% enrollment), then
 * the RC application itself, then the running clock, then the IEP right.
 */
import type { RcStatus, IepStatus } from '@/types/database';
import type { FunnelLocale } from '@/lib/eligibility';

export interface HomeInsight {
  key: 'sdp_path' | 'rc_apply' | 'rc_clock' | 'iep_eval';
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  /** Home-stack destination (screen name + optional params). */
  target: { screen: string; params?: Record<string, string> };
  citation: string;
}

export interface InsightInput {
  ageYears: number | null;
  rcStatus: RcStatus | null | undefined;
  iepStatus: IepStatus | null | undefined;
  hasDiagnosis: boolean;
  childName?: string | null;
}

export function deriveHomeInsight(
  input: InsightInput,
  locale: FunnelLocale = 'en'
): HomeInsight | null {
  const L = (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
  const { ageYears, rcStatus, iepStatus, hasDiagnosis } = input;
  const name = input.childName || L('your child', 'su hijo/a', 'con quý vị');
  const eyebrow = L('WAYPOINT NOTICED', 'WAYPOINT NOTÓ', 'WAYPOINT NHẬN THẤY');

  if (rcStatus === 'active') {
    return {
      key: 'sdp_path',
      eyebrow,
      title: L(
        `${name}'s services could become a budget you direct`,
        `Los servicios de ${name} podrían convertirse en un presupuesto que usted dirige`,
        `Dịch vụ của ${name} có thể trở thành ngân sách do quý vị điều hành`
      ),
      body: L(
        'As a Regional Center consumer, they almost certainly qualify for Self-Determination — only ~1.5% of families are enrolled, because families are rarely told. One letter starts it.',
        'Como consumidor del Centro Regional, casi con certeza califica para el Programa de Autodeterminación — solo ~1.5% de las familias está inscrito, porque rara vez se lo cuentan. Una carta lo inicia.',
        'Là thân chủ Trung tâm Khu vực, con gần như chắc chắn đủ điều kiện cho chương trình Tự quyết — chỉ ~1.5% gia đình ghi danh, vì ít ai được cho biết. Một lá thư là khởi đầu.'
      ),
      ctaLabel: L('See the path →', 'Ver el camino →', 'Xem con đường →'),
      target: { screen: 'ProcessMap' },
      citation: 'W&I §4685.8',
    };
  }

  if (rcStatus === 'applied') {
    // Under 3 the family is in Early Start (IDEA Part C): evaluation AND the
    // initial IFSP meeting are due within 45 days of referral — the 120-day
    // Lanterman assessment clock is the age-3+ path. Asserting the wrong
    // clock understates an infant family's rights (20-persona audit, Aug 2026).
    const earlyStart = ageYears !== null && ageYears < 3;
    return {
      key: 'rc_clock',
      eyebrow,
      title: L(
        'A legal clock is running in your favor',
        'Hay un plazo legal corriendo a su favor',
        'Một thời hạn pháp lý đang chạy có lợi cho quý vị'
      ),
      body: earlyStart
        ? L(
            `Early Start must complete ${name}'s evaluation AND hold the first IFSP meeting within 45 days of the referral. Log the date and Waypoint watches the clock with you.`,
            `Early Start debe completar la evaluación de ${name} Y realizar la primera reunión del IFSP dentro de 45 días de la referencia. Registre la fecha y Waypoint vigila el plazo con usted.`,
            `Early Start phải hoàn tất đánh giá của ${name} VÀ tổ chức buổi họp IFSP đầu tiên trong 45 ngày kể từ khi giới thiệu. Ghi lại ngày và Waypoint cùng quý vị canh thời hạn.`
          )
        : L(
            `${name}'s assessment must be completed within 120 days of applying. Log the date and Waypoint watches the clock with you.`,
            `La evaluación de ${name} debe completarse dentro de 120 días de la solicitud. Registre la fecha y Waypoint vigila el plazo con usted.`,
            `Đánh giá của ${name} phải hoàn tất trong 120 ngày kể từ khi nộp đơn. Ghi lại ngày nộp và Waypoint cùng quý vị canh thời hạn.`
          ),
      ctaLabel: L('Track the clock →', 'Seguir el plazo →', 'Theo dõi thời hạn →'),
      target: { screen: 'RequestTracker' },
      citation: earlyStart ? '34 CFR §303.310 · Early Start' : 'W&I §4643',
    };
  }

  if (hasDiagnosis && (rcStatus === 'unknown' || rcStatus === 'known' || !rcStatus)) {
    return {
      key: 'rc_apply',
      eyebrow,
      title: L(
        `${name} is likely entitled to services you're not using yet`,
        `${name} probablemente tiene derecho a servicios que aún no usa`,
        `${name} có thể có quyền hưởng những dịch vụ quý vị chưa dùng`
      ),
      body: L(
        'Regional Center services have no income test, no waiting list, and no cost — and the application starts with you, in writing.',
        'Los servicios del Centro Regional no tienen requisito de ingresos, no tienen lista de espera y no cuestan nada — y la solicitud la inicia usted, por escrito.',
        'Dịch vụ Trung tâm Khu vực không xét thu nhập, không danh sách chờ, không tốn phí — và đơn xin bắt đầu từ quý vị, bằng văn bản.'
      ),
      ctaLabel: L('See how the system works →', 'Cómo funciona el sistema →', 'Xem hệ thống hoạt động →'),
      target: { screen: 'ProcessMap' },
      citation: 'Lanterman Act',
    };
  }

  if (
    ageYears !== null &&
    ageYears >= 3 &&
    ageYears < 22 &&
    (iepStatus === 'no' || iepStatus === 'unknown')
  ) {
    return {
      key: 'iep_eval',
      eyebrow,
      title: L(
        'One letter starts a 15-day clock at school',
        'Una carta inicia un plazo de 15 días en la escuela',
        'Một lá thư khởi động thời hạn 15 ngày ở trường'
      ),
      body: L(
        `A written special-education evaluation request forces the district to respond with an assessment plan within 15 calendar days.`,
        `Una solicitud escrita de evaluación de educación especial obliga al distrito a responder con un plan de evaluación en 15 días calendario.`,
        `Yêu cầu đánh giá giáo dục đặc biệt bằng văn bản buộc học khu phải trả lời bằng kế hoạch đánh giá trong 15 ngày dương lịch.`
      ),
      ctaLabel: L('Draft the letter →', 'Redactar la carta →', 'Soạn thư →'),
      target: { screen: 'Letters', params: { template: 'assessment_request' } },
      citation: 'Ed Code §56321',
    };
  }

  return null;
}

/**
 * The Regional Center escalation ladder (Process Map Depth plan, Aug 2026)
 * — four rungs, in order, each with its own clock, letter, and tone.
 *
 * Tone rule (owner, Aug 2026): the first rung is always friendly and
 * collaborative — ask or request, never demand. The tone firms up only as
 * rungs go unanswered, matching the AI engine's collaborative → assertive →
 * adversarial calibration. Order matters twice over: each rung's written
 * record is the next rung's evidence, and starting warm keeps a years-long
 * coordinator relationship workable.
 *
 * Pure data, trilingual like the other funnel modules; citations stay
 * English and every one is registered in contentSources.
 */
import type { FunnelLocale } from '@/lib/eligibility';

export type RungTone = 'collaborative' | 'firm' | 'formal' | 'advocate';

export interface EscalationRung {
  /** 1-based rung number, climb order. */
  n: number;
  key: string;
  tone: RungTone;
  /** Short tone chip label, e.g. "Friendly & collaborative". */
  toneLabel: string;
  title: string;
  body: string;
  /** The clock on this rung, stated honestly. */
  clock: string;
  citation: string;
  /** Letter template that pulls this rung's lever (null = no letter). */
  leverTemplate: string | null;
  leverLabel: string | null;
}

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export function getEscalationRungs(locale: FunnelLocale = 'en'): EscalationRung[] {
  const L = picker(locale);
  return [
    {
      n: 1,
      key: 'friendly_ask',
      tone: 'collaborative',
      toneLabel: L('Friendly & collaborative', 'Amistoso y colaborativo', 'Thân thiện & hợp tác'),
      title: L(
        'Ask, in writing — and request an IPP review',
        'Pida, por escrito — y solicite una revisión del IPP',
        'Đề nghị, bằng văn bản — và yêu cầu xem xét IPP'
      ),
      body: L(
        'Name the gap warmly and ask for help closing it — your coordinator is your partner until proven otherwise. Putting it in writing is not hostile; it just starts the record. The Regional Center must hold the review within 30 days of your written request — no webinar, orientation, or "process" gates this right.',
        'Nombre la brecha con calidez y pida ayuda para cerrarla — su coordinador/a es su aliado/a hasta que se demuestre lo contrario. Ponerlo por escrito no es hostil; solo inicia el expediente. El Centro Regional debe realizar la revisión dentro de 30 días de su solicitud escrita — ningún webinar, orientación o "proceso" condiciona este derecho.',
        'Nêu vấn đề một cách thân thiện và đề nghị được giúp giải quyết — điều phối viên là đồng hành của quý vị cho đến khi có bằng chứng ngược lại. Viết ra văn bản không phải là thù địch; nó chỉ bắt đầu hồ sơ. Trung tâm Khu vực phải tổ chức buổi xem xét trong 30 ngày kể từ yêu cầu bằng văn bản — không hội thảo, định hướng hay "quy trình" nào được cản quyền này.'
      ),
      clock: L('30 days to the review meeting', '30 días hasta la reunión de revisión', '30 ngày đến buổi họp xem xét'),
      citation: 'W&I §4646.5(b)',
      leverTemplate: 'ipp_review_request',
      leverLabel: L('Send the friendly ask', 'Enviar la petición amistosa', 'Gửi lời đề nghị thân thiện'),
    },
    {
      n: 2,
      key: 'noa_appeal',
      tone: 'firm',
      toneLabel: L('Firm but professional', 'Firme pero profesional', 'Cứng rắn nhưng chuyên nghiệp'),
      title: L(
        'Request the written NOA — appeal if refused',
        'Solicite la NOA por escrito — apele si la niegan',
        'Yêu cầu NOA bằng văn bản — kháng cáo nếu bị từ chối'
      ),
      body: L(
        'Any denial, reduction, or termination must come as a written Notice of Action. No NOA yet? Request one — politely, citing the requirement. Then appeal within 60 days; file within 30 days and existing services continue during the appeal ("aid paid pending").',
        'Cualquier negación, reducción o terminación debe llegar como Notificación de Acción por escrito. ¿Aún no hay NOA? Solicítela — con cortesía, citando el requisito. Luego apele dentro de 60 días; presente dentro de 30 días y los servicios existentes continúan durante la apelación ("ayuda pagada pendiente").',
        'Mọi từ chối, cắt giảm hay chấm dứt phải bằng Thông báo Hành động văn bản. Chưa có NOA? Hãy yêu cầu — lịch sự, trích dẫn quy định. Rồi kháng cáo trong 60 ngày; nộp trong 30 ngày thì dịch vụ hiện có tiếp tục trong khi kháng cáo ("trợ cấp tiếp tục chờ xử lý").'
      ),
      clock: L(
        'Appeal within 60 days of the NOA — within 30 to keep services running',
        'Apele dentro de 60 días de la NOA — dentro de 30 para mantener los servicios',
        'Kháng cáo trong 60 ngày kể từ NOA — trong 30 ngày để giữ dịch vụ'
      ),
      citation: 'W&I §4710.5',
      leverTemplate: 'noa_request',
      leverLabel: L('Request the NOA', 'Solicitar la NOA', 'Yêu cầu NOA'),
    },
    {
      n: 3,
      key: 'complaint_4731',
      tone: 'formal',
      toneLabel: L('Formal', 'Formal', 'Chính thức'),
      title: L(
        '§4731 complaint to the RC director',
        'Queja §4731 al director del Centro Regional',
        'Khiếu nại §4731 gửi giám đốc Trung tâm'
      ),
      body: L(
        'For rights violations — not just service disagreements: the director must respond with a written proposed resolution within 20 working days. Unresolved complaints escalate to the Department of Developmental Services.',
        'Para violaciones de derechos — no solo desacuerdos de servicios: el director debe responder con una resolución propuesta por escrito dentro de 20 días hábiles. Las quejas no resueltas escalan al Departamento de Servicios del Desarrollo.',
        'Cho vi phạm quyền — không chỉ bất đồng về dịch vụ: giám đốc phải trả lời bằng đề xuất giải quyết văn bản trong 20 ngày làm việc. Khiếu nại chưa giải quyết được chuyển lên Sở Dịch vụ Phát triển (DDS).'
      ),
      clock: L('Written response within 20 working days', 'Respuesta escrita dentro de 20 días hábiles', 'Trả lời bằng văn bản trong 20 ngày làm việc'),
      citation: 'W&I §4731',
      leverTemplate: 'dds_4731_complaint',
      leverLabel: L('File the §4731 complaint', 'Presentar la queja §4731', 'Nộp đơn khiếu nại §4731'),
    },
    {
      n: 4,
      key: 'advocate',
      tone: 'advocate',
      toneLabel: L('You + an advocate', 'Usted + un defensor', 'Quý vị + người bênh vực'),
      title: L(
        'Bring in a free advocate',
        'Sume a un defensor gratuito',
        'Mời người bênh vực miễn phí'
      ),
      body: L(
        "OCRA — the Office of Clients' Rights Advocacy — has an advocate assigned to every Regional Center, free, by law. Disability Rights California takes systemic cases. You never have to climb alone, and you never have to pay.",
        'OCRA — la Oficina de Defensa de los Derechos de los Clientes — tiene un defensor asignado a cada Centro Regional, gratuito, por ley. Disability Rights California toma casos sistémicos. Nunca tiene que escalar solo/a, y nunca tiene que pagar.',
        'OCRA — Văn phòng Bênh vực Quyền Thân chủ — có người bênh vực được phân công cho từng Trung tâm Khu vực, miễn phí, theo luật. Disability Rights California nhận các vụ mang tính hệ thống. Quý vị không bao giờ phải leo thang một mình, và không bao giờ phải trả tiền.'
      ),
      clock: L('No clock — reach out any time, at any rung', 'Sin plazo — contacte en cualquier momento, en cualquier peldaño', 'Không thời hạn — liên hệ bất cứ lúc nào, ở bất kỳ nấc nào'),
      citation: 'OCRA · Disability Rights California',
      leverTemplate: null,
      leverLabel: null,
    },
  ];
}

/** English default kept for tests and non-localized consumers. */
export const ESCALATION_RUNGS: EscalationRung[] = getEscalationRungs('en');

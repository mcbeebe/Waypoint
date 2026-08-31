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
 * Trilingual like the rest of the funnel modules (default 'en' keeps every
 * existing caller and test green). Citations stay English; Spanish and
 * Vietnamese are careful drafts flagged for native-speaker review.
 */
import type { RequestType } from '@/lib/requestClocks';
import type { FunnelLocale } from '@/lib/eligibility';
import { MEDI_CAL_DEEMING_REQUEST_TITLE } from '@/lib/resourceStack';

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

/**
 * The tracker row a send should open — with the case-file guard: a lever
 * letter launched FROM an existing request (presetRequestId) must never
 * open a second clock row, whatever the template's default says. One
 * request, one thread, one clock.
 */
export function trackFor(
  next: SentNext | null,
  presetRequestId?: string | null
): SentNext['track'] {
  if (!next?.track) return null;
  return presetRequestId ? null : next.track;
}

export function sentNextFor(
  templateKey: string,
  childName?: string | null,
  locale: FunnelLocale = 'en'
): SentNext | null {
  const L = (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
  const name =
    childName || L('your child', 'su hijo/a', 'con quý vị');
  switch (templateKey) {
    case 'sdp_info_request':
      return {
        celebration: L(
          'You just asked the question most families never do.',
          'Acaba de hacer la pregunta que la mayoría de las familias nunca hace.',
          'Quý vị vừa hỏi câu mà hầu hết các gia đình không bao giờ hỏi.'
        ),
        did: L(
          `Only about 1.5% of Regional Center families are enrolled in Self-Determination — asking in writing puts ${name} on the path.`,
          `Solo ~1.5% de las familias del Centro Regional está inscrito en la Autodeterminación — pedirla por escrito pone a ${name} en el camino.`,
          `Chỉ ~1.5% gia đình Trung tâm Khu vực ghi danh chương trình Tự quyết — hỏi bằng văn bản đưa ${name} vào con đường đó.`
        ),
        expectations: [
          L(
            'Your Service Coordinator should confirm the orientation steps — two required 2-hour SCDD sessions (Part A before Part B), virtual, in 12 languages.',
            'Su coordinador/a de servicios debe confirmar los pasos de la orientación — dos sesiones obligatorias de 2 horas de SCDD (Parte A antes de la Parte B), virtuales, en 12 idiomas.',
            'Điều phối viên sẽ xác nhận các bước định hướng — hai buổi bắt buộc 2 giờ của SCDD (Phần A trước Phần B), trực tuyến, có 12 ngôn ngữ.'
          ),
          L(
            `The copies of ${name}'s authorizations are the budget basis — file them when they arrive.`,
            `Las copias de las autorizaciones de ${name} son la base del presupuesto — guárdelas cuando lleguen.`,
            `Bản sao các ủy quyền của ${name} là cơ sở ngân sách — hãy lưu lại khi nhận được.`
          ),
          L(
            'There is no legal clock on SDP itself (honestly: enrollment typically takes 3–12 months) — but every step along the way can be pushed with the 30-day IPP-meeting rule.',
            'No hay plazo legal para el SDP en sí (honestamente: la inscripción suele tomar de 3 a 12 meses) — pero cada paso se puede impulsar con la regla de la reunión del IPP en 30 días.',
            'SDP không có thời hạn pháp lý riêng (thành thật: ghi danh thường mất 3–12 tháng) — nhưng mỗi bước đều có thể thúc đẩy bằng quy tắc họp IPP 30 ngày.'
          ),
          L(
            'Next milestone: complete both parts, hand in the two certificates — the RC then owes you four things in writing (IPP copy, transition supports info, FMS info, budget steps). And get unmet needs into the IPP BEFORE the budget is calculated.',
            'Próximo hito: complete ambas partes y entregue los dos certificados — el Centro Regional entonces le debe cuatro cosas por escrito (copia del IPP, información de apoyos de transición, información del FMS, pasos del presupuesto). Y haga que las necesidades no cubiertas entren al IPP ANTES de que se calcule el presupuesto.',
            'Cột mốc tiếp theo: hoàn thành cả hai phần, nộp hai giấy chứng nhận — Trung tâm Khu vực khi đó phải cung cấp bốn thứ bằng văn bản (bản sao IPP, thông tin hỗ trợ chuyển tiếp, thông tin FMS, các bước ngân sách). Và đưa nhu cầu chưa đáp ứng vào IPP TRƯỚC KHI ngân sách được tính.'
          ),
        ],
        track: { requestType: 'other', title: 'SDP orientation & records request' },
        followUpDays: 14,
      };
    case 'ipp_review_request':
      return {
        celebration: L(
          'You just started a 30-day legal clock.',
          'Acaba de iniciar un plazo legal de 30 días.',
          'Quý vị vừa khởi động thời hạn pháp lý 30 ngày.'
        ),
        did: L(
          'The Regional Center must hold the IPP meeting within 30 days of your written request — W&I §4646.5(b).',
          'El Centro Regional debe realizar la reunión del IPP dentro de 30 días de su solicitud escrita — W&I §4646.5(b).',
          'Trung tâm Khu vực phải tổ chức họp IPP trong 30 ngày kể từ yêu cầu bằng văn bản của quý vị — W&I §4646.5(b).'
        ),
        expectations: [
          L(
            'Expect scheduling contact from your Service Coordinator — days, not weeks.',
            'Espere contacto para agendar de su coordinador/a — en días, no semanas.',
            'Điều phối viên sẽ liên hệ xếp lịch — tính bằng ngày, không phải tuần.'
          ),
          L(
            'Waypoint is tracking the 30-day deadline in your Requests.',
            'Waypoint está siguiendo el plazo de 30 días en sus Solicitudes.',
            'Waypoint đang theo dõi thời hạn 30 ngày trong mục Yêu cầu của quý vị.'
          ),
          L(
            'Before the meeting: write the unmet-needs list — everything you want in the plan, in writing.',
            'Antes de la reunión: escriba la lista de necesidades no cubiertas — todo lo que quiere en el plan, por escrito.',
            'Trước cuộc họp: viết danh sách nhu cầu chưa đáp ứng — mọi thứ quý vị muốn có trong kế hoạch, bằng văn bản.'
          ),
          L(
            'No response in 2 weeks? The follow-up letter cites the statute and the date.',
            '¿Sin respuesta en 2 semanas? La carta de seguimiento cita el estatuto y la fecha.',
            'Không có hồi âm sau 2 tuần? Thư nhắc sẽ trích dẫn điều luật và ngày yêu cầu.'
          ),
        ],
        track: { requestType: 'ipp_meeting', title: 'IPP review meeting request' },
        followUpDays: 14,
      };
    case 'assessment_request':
      return {
        celebration: L(
          'You just started a 15-day legal clock.',
          'Acaba de iniciar un plazo legal de 15 días.',
          'Quý vị vừa khởi động thời hạn pháp lý 15 ngày.'
        ),
        did: L(
          'The district must respond with an assessment plan within 15 calendar days — Ed Code §56321.',
          'El distrito debe responder con un plan de evaluación dentro de 15 días calendario — Ed Code §56321.',
          'Học khu phải trả lời bằng kế hoạch đánh giá trong 15 ngày dương lịch — Ed Code §56321.'
        ),
        expectations: [
          L(
            'An assessment plan arrives for your signature — read it and sign promptly.',
            'Llegará un plan de evaluación para su firma — léalo y fírmelo pronto.',
            'Kế hoạch đánh giá sẽ đến để quý vị ký — hãy đọc và ký sớm.'
          ),
          L(
            'After you consent, the district has 60 days to complete the evaluation and hold the IEP meeting.',
            'Después de su consentimiento, el distrito tiene 60 días para completar la evaluación y realizar la reunión del IEP.',
            'Sau khi quý vị đồng ý, học khu có 60 ngày để hoàn tất đánh giá và tổ chức họp IEP.'
          ),
          L(
            'Waypoint is tracking the 15-day deadline in your Requests.',
            'Waypoint está siguiendo el plazo de 15 días en sus Solicitudes.',
            'Waypoint đang theo dõi thời hạn 15 ngày trong mục Yêu cầu của quý vị.'
          ),
          L(
            'Silence past the deadline is a violation, not a delay — the follow-up letter says so politely.',
            'El silencio después del plazo es una violación, no una demora — la carta de seguimiento lo dice con cortesía.',
            'Im lặng quá thời hạn là vi phạm, không phải trì hoãn — thư nhắc sẽ nói điều đó một cách lịch sự.'
          ),
        ],
        track: { requestType: 'iep_evaluation', title: 'Special education evaluation request' },
        followUpDays: 10,
      };
    case 'noa_request':
      return {
        celebration: L(
          'You just turned a hallway "no" into a real decision.',
          'Acaba de convertir un "no" de pasillo en una decisión real.',
          'Quý vị vừa biến lời từ chối miệng thành một quyết định chính thức.'
        ),
        did: L(
          'A denial must come as a written Notice of Action with your appeal rights — W&I §4710. Verbal is not a decision.',
          'Una negación debe llegar como Notificación de Acción escrita con sus derechos de apelación — W&I §4710. Lo verbal no es una decisión.',
          'Từ chối phải là Thông báo Hành động bằng văn bản kèm quyền kháng cáo — W&I §4710. Nói miệng không phải là quyết định.'
        ),
        expectations: [
          L(
            'The written NOA should arrive promptly — when it does, your appeal clocks start (and Waypoint can draft the appeal).',
            'La NOA escrita debe llegar pronto — cuando llegue, empiezan sus plazos de apelación (y Waypoint puede redactar la apelación).',
            'NOA bằng văn bản sẽ sớm đến — khi đó, thời hạn kháng cáo bắt đầu (và Waypoint có thể soạn đơn kháng cáo).'
          ),
          L(
            'If it never comes, that silence itself is your evidence — Waypoint is tracking this request.',
            'Si nunca llega, ese silencio es su evidencia — Waypoint está siguiendo esta solicitud.',
            'Nếu không bao giờ đến, chính sự im lặng đó là bằng chứng — Waypoint đang theo dõi yêu cầu này.'
          ),
          L(
            'Keep providing services records in the meantime; nothing about your request pauses.',
            'Mientras tanto, siga documentando los servicios; nada de su solicitud se pausa.',
            'Trong lúc chờ, hãy tiếp tục lưu hồ sơ dịch vụ; yêu cầu của quý vị không hề tạm dừng.'
          ),
        ],
        track: { requestType: 'authorization', title: 'Written Notice of Action requested' },
        followUpDays: 10,
      };
    case 'records_request':
      return {
        celebration: L(
          `You just claimed ${name}'s paper trail.`,
          `Acaba de reclamar el expediente de ${name}.`,
          `Quý vị vừa đòi lại hồ sơ của ${name}.`
        ),
        did: L(
          'Records are the evidence for everything that comes next — IPP reviews, appeals, and the SDP budget basis.',
          'Los registros son la evidencia de todo lo que sigue — revisiones del IPP, apelaciones y la base del presupuesto del SDP.',
          'Hồ sơ là bằng chứng cho mọi việc tiếp theo — xem xét IPP, kháng cáo, và cơ sở ngân sách SDP.'
        ),
        expectations: [
          L(
            'School records: the district must provide them within 5 business days — Ed Code §56504.',
            'Registros escolares: el distrito debe entregarlos dentro de 5 días hábiles — Ed Code §56504.',
            'Hồ sơ trường học: học khu phải cung cấp trong 5 ngày làm việc — Ed Code §56504.'
          ),
          L(
            'Regional Center records: no fixed statute, but "promptly" is the standard — 2 weeks of silence earns a follow-up.',
            'Registros del Centro Regional: sin estatuto fijo, pero "con prontitud" es el estándar — 2 semanas de silencio ameritan un seguimiento.',
            'Hồ sơ Trung tâm Khu vực: không có điều luật cố định, nhưng chuẩn mực là "kịp thời" — im lặng 2 tuần thì nên gửi thư nhắc.'
          ),
          L(
            `When they arrive, add the IPP to Waypoint's Documents so everything lives in one place.`,
            'Cuando lleguen, agregue el IPP a Documentos en Waypoint para que todo viva en un solo lugar.',
            'Khi nhận được, hãy thêm IPP vào mục Tài liệu của Waypoint để mọi thứ ở một nơi.'
          ),
        ],
        track: { requestType: 'other', title: 'Records request (IPP, assessments, authorizations)' },
        followUpDays: 10,
      };
    case 'medi_cal_deeming':
      return {
        celebration: L(
          'You just asked for the key most families never hear about.',
          'Acaba de pedir la llave de la que la mayoría de las familias nunca oye hablar.',
          'Quý vị vừa yêu cầu chiếc chìa khóa mà hầu hết gia đình chưa từng nghe đến.'
        ),
        did: L(
          `Institutional deeming lets ${name} qualify for Medi-Cal without counting your income — and Medi-Cal is what unlocks IHSS paid care hours and federal SDP funding.`,
          `La consideración institucional permite que ${name} califique para Medi-Cal sin contar sus ingresos — y Medi-Cal es lo que abre las horas de cuidado pagadas de IHSS y el financiamiento federal del SDP.`,
          `Cơ chế "institutional deeming" giúp ${name} đủ điều kiện Medi-Cal mà không tính thu nhập của quý vị — và Medi-Cal chính là chìa khóa mở giờ chăm sóc IHSS và tài trợ liên bang cho SDP.`
        ),
        expectations: [
          L(
            'Your Service Coordinator should confirm the referral steps and the documents they need — deeming runs through the HCBS waiver, and the RC handles the referral.',
            'Su coordinador/a de servicios debe confirmar los pasos de la referencia y los documentos que necesitan — la consideración corre por la exención HCBS, y el Centro Regional maneja la referencia.',
            'Điều phối viên sẽ xác nhận các bước giới thiệu và giấy tờ cần thiết — cơ chế này chạy qua miễn trừ HCBS, và Trung tâm Khu vực lo phần giới thiệu.'
          ),
          L(
            'There is no statutory clock on this request — 2 weeks of silence earns the follow-up letter.',
            'Esta solicitud no tiene plazo legal — 2 semanas de silencio ameritan la carta de seguimiento.',
            'Yêu cầu này không có thời hạn pháp lý — im lặng 2 tuần thì nên gửi thư nhắc.'
          ),
          L(
            'Once Medi-Cal is active, the IHSS application at the county is the next layer — Waypoint will surface it.',
            'Cuando Medi-Cal esté activo, la solicitud de IHSS en el condado es la siguiente capa — Waypoint se la mostrará.',
            'Khi Medi-Cal có hiệu lực, đơn IHSS ở quận hạt là tầng tiếp theo — Waypoint sẽ nhắc quý vị.'
          ),
        ],
        track: { requestType: 'other', title: MEDI_CAL_DEEMING_REQUEST_TITLE },
        followUpDays: 14,
      };
    case 'ipp_need_request':
      return {
        celebration: L(
          'You just asked to get a need written into the plan.',
          'Acaba de pedir que una necesidad quede escrita en el plan.',
          'Quý vị vừa đề nghị ghi một nhu cầu vào kế hoạch.'
        ),
        did: L(
          `You asked the Regional Center to add a specific need to ${name}'s IPP — and what the IPP lists is what the RC works to secure.`,
          `Le pidió al Centro Regional agregar una necesidad específica al IPP de ${name} — y lo que el IPP incluye es lo que el Centro Regional debe conseguir.`,
          `Quý vị đã đề nghị Trung tâm Khu vực thêm một nhu cầu cụ thể vào IPP của ${name} — và điều IPP ghi là điều Trung tâm Khu vực phải bảo đảm.`
        ),
        expectations: [
          L(
            'Your Service Coordinator should note the need and talk with you about the support that meets it — often at the next IPP meeting.',
            'Su coordinador/a de servicios debe anotar la necesidad y hablar con usted sobre el apoyo que la atiende — a menudo en la próxima reunión del IPP.',
            'Điều phối viên sẽ ghi nhận nhu cầu và trao đổi với quý vị về hỗ trợ đáp ứng — thường tại buổi họp IPP kế tiếp.'
          ),
          L(
            'There is no statutory clock on this request — 2 weeks of silence earns a friendly follow-up.',
            'Esta solicitud no tiene plazo legal — 2 semanas de silencio ameritan un seguimiento amable.',
            'Yêu cầu này không có thời hạn pháp lý — im lặng 2 tuần thì nên nhắc nhẹ nhàng.'
          ),
          L(
            'Once it is written into the IPP, the support becomes something the Regional Center secures — not a favor.',
            'Una vez que quede escrito en el IPP, el apoyo se convierte en algo que el Centro Regional debe conseguir — no un favor.',
            'Khi đã ghi vào IPP, hỗ trợ trở thành điều Trung tâm Khu vực phải bảo đảm — không phải một ân huệ.'
          ),
        ],
        track: { requestType: 'other', title: 'Need added to the IPP (identified need)' },
        followUpDays: 14,
      };
    case 'delivery_plan_request':
      return {
        celebration: L(
          'You just turned a missing service into a tracked request.',
          'Acaba de convertir un servicio faltante en una solicitud con seguimiento.',
          'Quý vị vừa biến dịch vụ còn thiếu thành một yêu cầu được theo dõi.'
        ),
        did: L(
          `Authorized hours the Regional Center doesn't deliver are still owed — a vendor waitlist doesn't pause the obligation (W&I §4648). Asking warmly, in writing, starts the record and keeps your coordinator on your side.`,
          `Las horas autorizadas que el Centro Regional no entrega se siguen debiendo — una lista de espera del proveedor no pausa la obligación (W&I §4648). Pedir con calidez, por escrito, inicia el expediente y mantiene a su coordinador/a de su lado.`,
          `Số giờ đã duyệt mà Trung tâm Khu vực chưa cung cấp vẫn là nghĩa vụ của họ — danh sách chờ không tạm dừng nghĩa vụ đó (W&I §4648). Đề nghị thân thiện, bằng văn bản, bắt đầu hồ sơ và giữ điều phối viên đứng về phía quý vị.`
        ),
        expectations: [
          L(
            'Expect a delivery plan or an alternative-vendor option from your coordinator — this is a normal, answerable ask.',
            'Espere un plan de entrega o una opción de proveedor alternativo de su coordinador/a — es una petición normal y contestable.',
            'Điều phối viên sẽ đưa kế hoạch cung cấp hoặc phương án nhà cung cấp thay thế — đây là đề nghị bình thường, có thể trả lời.'
          ),
          L(
            'Keep logging authorized vs delivered hours — the gap itself is your evidence if this ever escalates.',
            'Siga registrando horas autorizadas vs. entregadas — la brecha misma es su evidencia si esto llega a escalar.',
            'Tiếp tục ghi giờ được duyệt so với giờ thực nhận — chính khoảng thiếu hụt là bằng chứng nếu việc này phải leo thang.'
          ),
          L(
            'No fixed clock on this ask (honestly) — 2 weeks of silence earns the follow-up, and the 30-day IPP review is the accelerator.',
            'Esta petición no tiene plazo fijo (honestamente) — 2 semanas de silencio ameritan el seguimiento, y la revisión del IPP de 30 días es el acelerador.',
            'Đề nghị này không có thời hạn cố định (thành thật) — im lặng 2 tuần thì gửi thư nhắc, và quyền họp IPP trong 30 ngày là đòn bẩy.'
          ),
        ],
        track: { requestType: 'other', title: 'Service delivery plan request' },
        followUpDays: 14,
      };
    case 'progress_data_request':
      return {
        celebration: L(
          'You just asked for the numbers the IEP promised.',
          'Acaba de pedir los números que el IEP prometió.',
          'Quý vị vừa yêu cầu những con số mà IEP đã hứa.'
        ),
        did: L(
          'Progress reports on every goal are due at least as often as report cards, and service logs show minutes delivered vs the IEP — checking is normal parenting, and your friendly ask reads that way.',
          'Los informes de progreso de cada meta se deben entregar al menos tan seguido como las boletas, y los registros de servicio muestran minutos entregados vs. el IEP — verificar es crianza normal, y su petición amistosa se lee así.',
          'Báo cáo tiến bộ cho từng mục tiêu phải có ít nhất thường xuyên như phiếu điểm, và nhật ký dịch vụ cho thấy số phút thực nhận so với IEP — kiểm tra là việc làm cha mẹ bình thường, và lời đề nghị thân thiện của quý vị thể hiện đúng như vậy.'
        ),
        expectations: [
          L(
            'Records must arrive within 5 business days of your written request — Ed Code §56504. Waypoint is tracking it.',
            'Los registros deben llegar dentro de 5 días hábiles de su solicitud escrita — Ed Code §56504. Waypoint le da seguimiento.',
            'Hồ sơ phải đến trong 5 ngày làm việc kể từ yêu cầu bằng văn bản — Ed Code §56504. Waypoint đang theo dõi.'
          ),
          L(
            '"Making progress" without a number is not a report — compare the data against the baselines written in the IEP.',
            '"Está progresando" sin un número no es un informe — compare los datos con las líneas base escritas en el IEP.',
            '"Đang tiến bộ" mà không có con số thì không phải báo cáo — hãy so dữ liệu với mức nền ghi trong IEP.'
          ),
          L(
            'Minutes short of the IEP are owed back (compensatory education); slow progress is evidence for more services, never for lower goals.',
            'Los minutos por debajo del IEP se deben compensar (educación compensatoria); el progreso lento es evidencia para más servicios, nunca para metas más bajas.',
            'Số phút thiếu so với IEP phải được bù (giáo dục bù đắp); tiến bộ chậm là bằng chứng cần thêm dịch vụ, không bao giờ là lý do hạ mục tiêu.'
          ),
          L(
            'Ask again each grading period — a pattern in the data is what moves an IEP team.',
            'Pida de nuevo cada período de calificaciones — un patrón en los datos es lo que mueve al equipo del IEP.',
            'Hãy hỏi lại mỗi kỳ học — xu hướng trong dữ liệu chính là điều làm nhóm IEP hành động.'
          ),
        ],
        track: { requestType: 'other', title: 'Progress data + service logs request' },
        followUpDays: 7,
      };
    case 'rc_timeline_followup':
      return {
        celebration: L(
          'Paper trail reinforced.',
          'Expediente reforzado.',
          'Hồ sơ đã được củng cố.'
        ),
        did: L(
          'A written follow-up citing the statute and the date is exactly what moves stalled requests — and exactly what a hearing officer wants to see if it comes to that.',
          'Un seguimiento escrito que cita el estatuto y la fecha es exactamente lo que mueve solicitudes estancadas — y exactamente lo que un juez administrativo quiere ver si se llega a eso.',
          'Thư nhắc bằng văn bản trích dẫn điều luật và ngày tháng chính là điều làm chuyển động các yêu cầu bị đình trệ — và chính là điều thẩm phán hành chính muốn thấy nếu phải ra điều trần.'
        ),
        expectations: [
          L(
            'Agencies usually move within days of a statute-citing follow-up.',
            'Las agencias suelen moverse a los pocos días de un seguimiento que cita el estatuto.',
            'Các cơ quan thường hành động trong vài ngày sau thư nhắc có trích dẫn điều luật.'
          ),
          L(
            'If this one goes unanswered too, the next step is a §4731 complaint — Waypoint can draft it.',
            'Si este también queda sin respuesta, el siguiente paso es una queja §4731 — Waypoint puede redactarla.',
            'Nếu thư này cũng không được trả lời, bước tiếp theo là đơn khiếu nại §4731 — Waypoint có thể soạn giúp.'
          ),
        ],
        track: null, // it follows up an existing tracked request
        followUpDays: 7,
      };
    default:
      return null;
  }
}

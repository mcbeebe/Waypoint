/**
 * Learn (Roadmap/Home-Rebuild-Plan.md phase 5) — the library that lives under
 * the Ask composer.
 *
 * A parent asks a question in two ways: they type it, or they go looking for
 * it. This is the second. Three shapes, in the order a family actually needs
 * them:
 *
 * - **Paths** — the whole system, end to end, pointing at screens that exist.
 * - **Articles** — one question, answered, each ending in an action the app
 *   can actually take.
 * - **Glossary** — the words agencies use, in plain language.
 *
 * Rules this module holds:
 * - **Every article ends in an action that exists.** An explainer that leaves
 *   a family with nothing to do is where the old blog died.
 * - **A legal claim carries a citation** covered by `data/contentSources.ts`,
 *   and citations never translate.
 * - **Search is the point.** A parent types "what is an IPP" into Ask; the
 *   library must answer before the AI has to.
 *
 * Pure — no react-native, no supabase — so search, parity and provenance are
 * unit-testable. Phase 8 grows the article set; the schema is set here.
 */
import type { FunnelLocale } from '@/lib/eligibility';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export interface LearnTarget {
  screen: string;
  params?: Record<string, string>;
  /**
   * The tab stack that registers the screen — REQUIRED, because the Learn
   * panel renders inside the Ask stack and a `navigate` bubbles to parents,
   * never to a sibling. Without it every one of these is a silent no-op.
   */
  tab: string;
}

export interface LearnPath {
  key: string;
  icon: string;
  title: string;
  description: string;
  target: LearnTarget;
  /** Extra plain-language words search should match. */
  terms: string[];
}

/**
 * One block of an article body (phase 8, slice 8-0). A small, typed set the
 * reader renders consistently and the future SEO build can turn into clean
 * HTML/JSON-LD — deliberately NOT free markdown, so content stays art-directed.
 * Every text string is trilingual, built with the same `L()` picker as the rest.
 */
export type ArticleBlock =
  | { kind: 'para'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'callout'; text: string }
  // A "tool" the parent KEEPS — the utility-over-prose bet (owner framework,
  // Aug 2026). Copyable to their notes. A checklist is ticked items; a script
  // is words to say on the phone or in person. An EMAIL is never a tool here —
  // it is the article's end-action, which opens the real draft-and-send flow
  // (the Letters composer), so nothing is copy-pasted that Waypoint can send.
  | { kind: 'checklist'; label: string; items: string[] }
  | { kind: 'script'; label: string; text: string };

/**
 * The caregiver's journey (owner framework, Aug 2026). Learn is organized by
 * WHERE a parent is, not by topic. Optional so derived/legacy articles compose
 * without one; the library groups by it when present.
 */
export type LearnStage =
  | 'noticing'      // "Something isn't right"
  | 'seeking_help'  // "I need help"
  | 'overwhelmed'   // "I'm overwhelmed"
  | 'advocating'    // "I'm advocating"
  | 'now_what';     // "Now what"

/**
 * The conversation bridge (reframe, Aug 2026) — the handoff from a static
 * article into a personalized AI conversation. Required on every article: an
 * article that only teaches is a dead end. See
 * `Roadmap/initiatives/004-learn-content-engine/editorial-spec.md`.
 *
 * It is an invitation, never a funnel — the article must read as complete if a
 * parent never taps it (two doors, never forced). Every string is trilingual.
 */
export interface ArticleBridge {
  /** The CTA on the article — "Help me figure out my next step". */
  label: string;
  /** One line under it, inviting the parent to type in their own situation. */
  blurb: string;
  /**
   * The opener handed to the AI so it starts already knowing what the parent
   * was reading — never a blank "ask us anything" box. Phrased as the parent's
   * first message, so `NavigatorMain` can seed the conversation from it.
   */
  seed: string;
}

export interface LearnArticle {
  key: string;
  title: string;
  /** The two or three sentences a parent needs before the action. */
  summary: string;
  /**
   * The one question this article answers, in the parent's words — the title's
   * spine, and the canonical question the SEO build and the AI both retrieve on.
   * Required (reframe, Aug 2026).
   */
  primaryQuestion: string;
  /**
   * The 5–10 questions a parent asks NEXT. Triple duty: the tappable chips when
   * the AI opens, the JSON-LD FAQPage on the web page, and the flywheel signal
   * (a high-frequency question no article answers is the next one to write).
   */
  relatedQuestions: string[];
  /** The handoff into the AI. Required — see ArticleBridge. */
  bridge: ArticleBridge;
  /** The readable article. The `summary` is the card blurb; this is the page. */
  body: ArticleBlock[];
  /** Roughly how long it takes to read — honest, not padded. */
  minutes: number;
  /** Legal basis, when the article makes a legal claim. Never translated. */
  citation?: string;
  /**
   * ISO date a HUMAN last checked this body against the law it cites. The
   * reader renders it as a "Reviewed" seal, so it must never be set until that
   * review actually happened — an AI-drafted body that no one has verified
   * carries NO reviewedOn (the seal is hidden), rather than a false date. The
   * owner stamps it as part of approving the content (8-2 pipeline).
   */
  reviewedOn?: string;
  /**
   * Where in the journey a parent reading this is (owner framework, Aug 2026).
   * Optional so derived and legacy articles compose without one; the Learn
   * panel groups by it when present.
   */
  stage?: LearnStage;
  /** What to do next. Every article ends in something the app can do. */
  actionLabel: string;
  target: LearnTarget;
  terms: string[];
}

export interface GlossaryEntry {
  term: string;
  plain: string;
  citation?: string;
  terms: string[];
}

export interface LearnLibrary {
  paths: LearnPath[];
  articles: LearnArticle[];
  glossary: GlossaryEntry[];
}

export function getLearnPaths(locale: FunnelLocale = 'en'): LearnPath[] {
  const L = picker(locale);
  return [
    {
      key: 'process_rc',
      icon: 'compass-outline',
      title: L(
        'How the Regional Center works',
        'Cómo funciona el Centro Regional',
        'Trung tâm Khu vực hoạt động thế nào'
      ),
      description: L(
        'Intake → eligibility → IPP → services, with every legal deadline and the letter that moves it.',
        'Admisión → elegibilidad → IPP → servicios, con cada plazo legal y la carta que lo mueve.',
        'Tiếp nhận → điều kiện → IPP → dịch vụ, kèm mọi thời hạn luật định và lá thư giúp tiến triển.'
      ),
      target: { screen: 'ProcessMap', params: { system: 'rc' }, tab: 'Home' },
      terms: ['regional center', 'rc', 'ipp', 'intake', 'centro regional', 'trung tâm'],
    },
    {
      key: 'process_school',
      icon: 'school-outline',
      title: L(
        'How the school system works',
        'Cómo funciona el sistema escolar',
        'Hệ thống trường học hoạt động thế nào'
      ),
      description: L(
        'Evaluation → IEP → progress data → what to do when you disagree.',
        'Evaluación → IEP → datos de progreso → qué hacer si no está de acuerdo.',
        'Đánh giá → IEP → dữ liệu tiến bộ → làm gì khi quý vị không đồng ý.'
      ),
      target: { screen: 'ProcessMap', params: { system: 'school' }, tab: 'Home' },
      terms: ['school', 'iep', 'district', 'escuela', 'trường', 'evaluation'],
    },
    {
      key: 'benefits',
      icon: 'layers-outline',
      title: L(
        'Money and benefits, layer by layer',
        'Dinero y beneficios, capa por capa',
        'Tiền và quyền lợi, từng tầng một'
      ),
      description: L(
        'Medi-Cal, IHSS, SSI and Regional Center funding — which one unlocks the next.',
        'Medi-Cal, IHSS, SSI y fondos del Centro Regional — cuál desbloquea el siguiente.',
        'Medi-Cal, IHSS, SSI và ngân sách Trung tâm Khu vực — tầng nào mở ra tầng nào.'
      ),
      target: { screen: 'ResourceStack', tab: 'Home' },
      terms: ['medi-cal', 'ihss', 'ssi', 'money', 'benefits', 'dinero', 'tiền'],
    },
    {
      key: 'escalation',
      icon: 'trending-up-outline',
      title: L(
        'When services are not working',
        'Cuando los servicios no funcionan',
        'Khi dịch vụ không hiệu quả'
      ),
      description: L(
        'Ask, follow up, then the formal steps — one rung at a time, never starting at the top.',
        'Pedir, dar seguimiento y luego los pasos formales — un escalón a la vez, nunca empezando arriba.',
        'Đề nghị, nhắc lại, rồi các bước chính thức — từng nấc một, không bao giờ bắt đầu từ trên cùng.'
      ),
      target: { screen: 'EscalationLadder', tab: 'Home' },
      terms: ['complaint', 'appeal', 'denied', 'queja', 'khiếu nại', 'no'],
    },
  ];
}

export function getLearnArticles(locale: FunnelLocale = 'en'): LearnArticle[] {
  const L = picker(locale);
  return [
    {
      key: 'rc_said_no',
      title: L(
        '“We don’t fund that” — what to do when the Regional Center says no',
        '“No financiamos eso” — qué hacer cuando el Centro Regional dice que no',
        '“Chúng tôi không tài trợ khoản đó” — làm gì khi Trung tâm Khu vực từ chối'
      ),
      summary: L(
        'A spoken no is not a decision. Ask for it in writing: a Notice of Action states the reason and your right to appeal. Most families never ask, and the denial simply stands.',
        'Un no hablado no es una decisión. Pídalo por escrito: un Aviso de Acción indica el motivo y su derecho a apelar. La mayoría de las familias nunca lo pide, y la negación simplemente queda.',
        'Lời từ chối bằng miệng không phải là một quyết định. Hãy yêu cầu bằng văn bản: Thông báo Hành động nêu lý do và quyền kháng nghị của quý vị. Hầu hết gia đình không yêu cầu, và lời từ chối cứ thế tồn tại.'
      ),
      minutes: 6,
      // §4710 is the section that REQUIRES the written Notice of Action;
      // §4710.5 is the appeal window, which this article does not claim.
      citation: 'W&I §4710',
      body: [
        {
          kind: 'para',
          text: L(
            'A “no” on the phone is not a decision you can act on — and it is not one you have to accept. When the Regional Center denies, reduces, or ends a service, California law says it owes you that decision in writing.',
            'Un “no” por teléfono no es una decisión sobre la que pueda actuar, y no es una que tenga que aceptar. Cuando el Centro Regional niega, reduce o termina un servicio, la ley de California dice que le debe esa decisión por escrito.',
            'Một câu “không” qua điện thoại không phải là quyết định quý vị có thể hành động — và cũng không phải điều quý vị buộc phải chấp nhận. Khi Trung tâm Khu vực từ chối, giảm bớt hoặc chấm dứt một dịch vụ, luật California nói rằng họ nợ quý vị quyết định đó bằng văn bản.'
          ),
        },
        {
          kind: 'para',
          text: L(
            'That written decision is a Notice of Action. It has to state the specific reason for the no, the rule it relies on, and your right to appeal it. Until you have it, there is nothing official to challenge, which is exactly why most families never get one: no one tells them to ask.',
            'Esa decisión por escrito es un Aviso de Acción. Debe indicar el motivo específico del no, la regla en que se basa y su derecho a apelarla. Hasta que lo tenga, no hay nada oficial que impugnar, y por eso la mayoría de las familias nunca lo recibe: nadie les dice que lo pidan.',
            'Quyết định bằng văn bản đó là Thông báo Hành động. Nó phải nêu lý do cụ thể của câu từ chối, quy định mà nó dựa vào, và quyền kháng nghị của quý vị. Cho đến khi có nó, không có gì chính thức để phản đối, và đó chính là lý do hầu hết gia đình không bao giờ nhận được: không ai bảo họ yêu cầu.'
          ),
        },
        {
          kind: 'steps',
          items: [
            L('Ask, in writing, for a Notice of Action on the exact service.', 'Pida, por escrito, un Aviso de Acción sobre el servicio exacto.', 'Yêu cầu bằng văn bản một Thông báo Hành động về đúng dịch vụ đó.'),
            L('Keep your request and its date — it is your proof that you asked.', 'Guarde su solicitud y su fecha — es su prueba de que pidió.', 'Giữ lại yêu cầu và ngày tháng — đó là bằng chứng quý vị đã đề nghị.'),
            L('When the Notice arrives, read the reason: it tells you what to answer.', 'Cuando llegue el Aviso, lea el motivo: le dice qué responder.', 'Khi Thông báo đến, hãy đọc lý do: nó cho quý vị biết cần trả lời điều gì.'),
          ],
        },
        {
          kind: 'callout',
          text: L(
            'Ask first, firmly second. The first request is simply “please put the decision in writing.” The tone only firms up if it goes unanswered.',
            'Pida primero, con firmeza después. La primera solicitud es simplemente “por favor pongan la decisión por escrito.” El tono solo se endurece si no hay respuesta.',
            'Đề nghị trước, cứng rắn sau. Yêu cầu đầu tiên chỉ là “xin hãy ghi quyết định bằng văn bản.” Giọng điệu chỉ cứng rắn hơn nếu không được trả lời.'
          ),
        },
        {
          kind: 'checklist',
          label: L(
            'Write these down while the call is fresh',
            'Anote esto mientras la llamada está fresca',
            'Ghi lại những điều này khi cuộc gọi còn mới'
          ),
          items: [
            L('The date and time you called', 'La fecha y hora en que llamó', 'Ngày và giờ quý vị gọi'),
            L('The name of the person who said no', 'El nombre de la persona que dijo que no', 'Tên người đã từ chối'),
            L('The exact service they denied', 'El servicio exacto que negaron', 'Dịch vụ cụ thể họ đã từ chối'),
            L('The reason they gave, in their words', 'El motivo que dieron, con sus palabras', 'Lý do họ đưa ra, theo lời của họ'),
          ],
        },
      ],
      stage: 'advocating',
      primaryQuestion: L(
        'What do I do when the Regional Center says no?',
        '¿Qué hago cuando el Centro Regional dice que no?',
        'Tôi phải làm gì khi Trung tâm Khu vực từ chối?'
      ),
      relatedQuestions: [
        L('How do I get a denial in writing?', '¿Cómo consigo la negación por escrito?', 'Làm sao để nhận từ chối bằng văn bản?'),
        L('What is a Notice of Action?', '¿Qué es un Aviso de Acción?', 'Thông báo Hành động là gì?'),
        L('How long do I have to appeal?', '¿Cuánto tiempo tengo para apelar?', 'Tôi có bao lâu để kháng nghị?'),
        L('Can I keep my services during an appeal?', '¿Puedo mantener mis servicios durante una apelación?', 'Tôi có thể giữ dịch vụ trong khi kháng nghị không?'),
        L('They only said no on the phone — does that count?', 'Solo dijeron que no por teléfono — ¿eso cuenta?', 'Họ chỉ từ chối qua điện thoại — điều đó có tính không?'),
      ],
      bridge: {
        label: L('Help me respond to this no', 'Ayúdame a responder a este no', 'Giúp tôi phản hồi lời từ chối này'),
        blurb: L(
          'Tell me what they said and I’ll help you ask for it in writing.',
          'Dígame qué dijeron y le ayudaré a pedirlo por escrito.',
          'Hãy cho tôi biết họ nói gì và tôi sẽ giúp quý vị yêu cầu bằng văn bản.'
        ),
        seed: L(
          'The Regional Center told me no and I want to respond.',
          'El Centro Regional me dijo que no y quiero responder.',
          'Trung tâm Khu vực đã từ chối tôi và tôi muốn phản hồi.'
        ),
      },
      actionLabel: L(
        'Ask for it in writing',
        'Pedirlo por escrito',
        'Yêu cầu bằng văn bản'
      ),
      target: { screen: 'Letters', params: { template: 'noa_request' }, tab: 'Home' },
      terms: ['denied', 'no', 'noa', 'notice of action', 'appeal', 'negado', 'từ chối'],
    },
    {
      key: 'ipp_clock',
      title: L(
        'The 30-day IPP clock, explained',
        'El plazo de 30 días del IPP, explicado',
        'Đồng hồ 30 ngày của IPP, giải thích'
      ),
      // The 7-day path is in the same subdivision as the 30-day one, and it
      // is the half a family in crisis needs. Leaving it out is not neutral:
      // it tells a parent to wait a month when the law gives them a week.
      summary: L(
        'When you ask for an IPP review, the Regional Center has 30 days to hold it — and no more than 7 days if the meeting is needed for your child’s health and safety, or to keep them living at home. The clock runs from your request, which is why the date you asked matters more than anything discussed by telephone.',
        'Cuando pide una revisión del IPP, el Centro Regional tiene 30 días para realizarla — y no más de 7 días si la reunión es necesaria para la salud y seguridad de su hijo/a, o para que siga viviendo en casa. El plazo corre desde su solicitud, por eso la fecha en que pidió importa más que lo conversado por teléfono.',
        'Khi quý vị đề nghị xem lại IPP, Trung tâm Khu vực có 30 ngày để tổ chức — và không quá 7 ngày nếu buổi họp cần cho sức khỏe và an toàn của con quý vị, hoặc để cháu tiếp tục sống tại nhà. Thời hạn tính từ ngày quý vị đề nghị, vì vậy ngày đề nghị quan trọng hơn bất cứ điều gì trao đổi qua điện thoại.'
      ),
      minutes: 4,
      citation: 'W&I §4646.5(b)',
      body: [
        {
          kind: 'para',
          text: L(
            'When you ask for an IPP review, the Regional Center has 30 days to hold it. The clock runs from the day you asked — which is why the date of your request matters more than anything said by phone.',
            'Cuando pide una revisión del IPP, el Centro Regional tiene 30 días para realizarla. El plazo corre desde el día en que pidió — por eso la fecha de su solicitud importa más que lo conversado por teléfono.',
            'Khi quý vị đề nghị xem lại IPP, Trung tâm Khu vực có 30 ngày để tổ chức. Thời hạn tính từ ngày quý vị đề nghị — vì vậy ngày yêu cầu quan trọng hơn bất cứ điều gì nói qua điện thoại.'
          ),
        },
        {
          kind: 'callout',
          text: L(
            'There is a faster track when the meeting is urgent for your child’s health and safety, or to keep them living at home. If that is your situation, say so in writing and ask for an expedited review.',
            'Hay una vía más rápida cuando la reunión es urgente para la salud y seguridad de su hijo/a, o para que siga viviendo en casa. Si es su caso, dígalo por escrito y pida una revisión acelerada.',
            'Có một cách nhanh hơn khi buổi họp khẩn cấp cho sức khỏe và an toàn của con quý vị, hoặc để cháu tiếp tục sống tại nhà. Nếu đúng hoàn cảnh của quý vị, hãy nói rõ bằng văn bản và đề nghị xem xét khẩn cấp.'
          ),
        },
        {
          kind: 'para',
          text: L(
            'A request by phone leaves no date to hold anyone to. Put it in writing, note the day, and the 30- (or 7-) day count begins on a date you can prove.',
            'Una solicitud por teléfono no deja una fecha a la cual atenerse. Póngala por escrito, anote el día, y la cuenta de 30 (o 7) días empieza en una fecha que puede probar.',
            'Yêu cầu qua điện thoại không để lại ngày nào để dựa vào. Hãy ghi bằng văn bản, ghi lại ngày, và mốc 30 (hoặc 7) ngày bắt đầu từ một ngày quý vị chứng minh được.'
          ),
        },
        {
          kind: 'checklist',
          label: L(
            'Keep this with your request',
            'Guarde esto con su solicitud',
            'Giữ điều này cùng với yêu cầu của quý vị'
          ),
          items: [
            L('The date you sent the request', 'La fecha en que envió la solicitud', 'Ngày quý vị gửi yêu cầu'),
            L(
              'Whether you asked for the 7-day urgent track',
              'Si pidió la vía urgente de 7 días',
              'Quý vị có đề nghị cách khẩn cấp 7 ngày hay không'
            ),
            L('The service or change you asked to review', 'El servicio o cambio que pidió revisar', 'Dịch vụ hoặc thay đổi quý vị đề nghị xem lại'),
            L(
              'The date 30 (or 7) days out, on your calendar',
              'La fecha a 30 (o 7) días, en su calendario',
              'Ngày 30 (hoặc 7) ngày sau, trên lịch của quý vị'
            ),
          ],
        },
      ],
      stage: 'advocating',
      primaryQuestion: L(
        'How long does the Regional Center have to hold my IPP meeting?',
        '¿Cuánto tiempo tiene el Centro Regional para hacer mi reunión de IPP?',
        'Trung tâm Khu vực có bao lâu để tổ chức buổi họp IPP của tôi?'
      ),
      relatedQuestions: [
        L('How do I ask for an IPP review?', '¿Cómo pido una revisión del IPP?', 'Làm sao để đề nghị xem lại IPP?'),
        L('When can I get a 7-day expedited meeting?', '¿Cuándo puedo obtener una reunión acelerada de 7 días?', 'Khi nào tôi có thể được họp khẩn cấp 7 ngày?'),
        L('Does my request have to be in writing?', '¿Mi solicitud tiene que ser por escrito?', 'Yêu cầu của tôi có phải bằng văn bản không?'),
        L('What counts as a health-and-safety emergency?', '¿Qué cuenta como una emergencia de salud y seguridad?', 'Điều gì được coi là khẩn cấp về sức khỏe và an toàn?'),
        L('What if the 30 days have already passed?', '¿Y si los 30 días ya pasaron?', 'Nếu 30 ngày đã trôi qua thì sao?'),
      ],
      bridge: {
        label: L('Help me start the clock', 'Ayúdame a empezar el plazo', 'Giúp tôi bắt đầu tính thời hạn'),
        blurb: L(
          'Tell me what you need reviewed and I’ll help you put the request in writing.',
          'Dígame qué necesita revisar y le ayudaré a poner la solicitud por escrito.',
          'Hãy cho tôi biết quý vị cần xem lại điều gì và tôi sẽ giúp viết yêu cầu bằng văn bản.'
        ),
        seed: L(
          'I want to ask for an IPP review and start the clock.',
          'Quiero pedir una revisión del IPP y empezar el plazo.',
          'Tôi muốn đề nghị xem lại IPP và bắt đầu tính thời hạn.'
        ),
      },
      actionLabel: L('Track this request', 'Registrar esta solicitud', 'Theo dõi yêu cầu này'),
      target: { screen: 'RequestTracker', tab: 'Home' },
      terms: [
        'ipp', '30 days', '7 days', 'clock', 'meeting', 'urgent', 'health and safety',
        'plazo', 'urgente', 'salud y seguridad', 'thời hạn', 'khẩn cấp', 'sức khỏe',
      ],
    },
    {
      key: 'rc_money',
      title: L(
        'Diapers, strollers, camps: what Regional Center money actually covers',
        'Pañales, coches, campamentos: qué cubre realmente el dinero del Centro Regional',
        'Tã, xe đẩy, trại hè: tiền của Trung tâm Khu vực thực sự chi trả cho gì'
      ),
      // States what is fundable and what the family will be asked first —
      // generic resources come before regional-center money, and a family
      // that does not know that reads the refusal as a no.
      summary: L(
        'Regional Centers can fund more than services: diapers past toilet-training age, adaptive equipment, respite, and camps. Anything the IPP lists, the Regional Center has to secure — so the ask starts by getting it written into the plan. Expect to be asked about insurance, school and other generic resources first.',
        'Los Centros Regionales pueden financiar más que servicios: pañales pasada la edad de entrenamiento, equipo adaptado, respiro y campamentos. Todo lo que el IPP incluye, el Centro Regional debe conseguirlo — así que el pedido empieza por lograr que quede escrito en el plan. Espere que le pregunten primero por el seguro, la escuela y otros recursos genéricos.',
        'Trung tâm Khu vực có thể tài trợ nhiều hơn dịch vụ: tã sau tuổi tập vệ sinh, thiết bị thích ứng, chăm sóc thay thế và trại hè. Bất cứ điều gì IPP ghi, Trung tâm Khu vực phải bảo đảm — nên hãy bắt đầu bằng việc đưa nó vào kế hoạch. Hãy chuẩn bị được hỏi trước về bảo hiểm, nhà trường và các nguồn lực chung khác.'
      ),
      minutes: 7,
      // What the IPP lists, the regional center must secure — which is the
      // claim this article actually makes about funding.
      citation: 'W&I §4646.5 · §4648(a)',
      body: [
        {
          kind: 'para',
          text: L(
            'Regional Centers fund more than therapies. Diapers past toilet-training age, adaptive equipment, respite, and camps can all be covered — and these are the supports families most often miss, because no one lists them.',
            'Los Centros Regionales financian más que terapias. Pañales pasada la edad de aprender a ir al baño, equipo adaptado, relevo y campamentos pueden estar cubiertos — y son los apoyos que las familias más pasan por alto, porque nadie los menciona.',
            'Trung tâm Khu vực tài trợ nhiều hơn các liệu pháp. Tã sau tuổi tập vệ sinh, thiết bị thích ứng, chăm sóc thay thế và trại hè đều có thể được chi trả — và đây là những hỗ trợ gia đình thường bỏ lỡ nhất, vì không ai liệt kê ra.'
          ),
        },
        {
          kind: 'para',
          text: L(
            'The key is the plan: what the IPP lists, the Regional Center has to secure. So the ask starts by getting the need written into the plan — not by asking for a reimbursement after the fact.',
            'La clave es el plan: lo que el IPP incluye, el Centro Regional debe conseguirlo. Así que el pedido empieza por lograr que la necesidad quede escrita en el plan — no por pedir un reembolso después.',
            'Điều then chốt là kế hoạch: điều gì IPP ghi, Trung tâm Khu vực phải bảo đảm. Vì vậy hãy bắt đầu bằng việc đưa nhu cầu vào kế hoạch — không phải xin hoàn tiền sau khi đã chi.'
          ),
        },
        {
          kind: 'callout',
          text: L(
            'Expect to be asked about insurance, school, and other “generic resources” first. That is the process, not a refusal — a family that knows this reads it as a step, not a no.',
            'Espere que le pregunten primero por el seguro, la escuela y otros “recursos genéricos.” Es el proceso, no un rechazo — una familia que lo sabe lo lee como un paso, no como un no.',
            'Hãy chuẩn bị được hỏi trước về bảo hiểm, nhà trường và các “nguồn lực chung” khác. Đó là quy trình, không phải sự từ chối — gia đình biết điều này sẽ xem đó là một bước, không phải câu từ chối.'
          ),
        },
        {
          kind: 'checklist',
          label: L(
            'Bring this to the IPP meeting',
            'Lleve esto a la reunión del IPP',
            'Mang điều này đến buổi họp IPP'
          ),
          items: [
            L(
              'The specific need — diapers, respite, camp, equipment',
              'La necesidad específica — pañales, relevo, campamento, equipo',
              'Nhu cầu cụ thể — tã, chăm sóc thay thế, trại hè, thiết bị'
            ),
            L(
              'What you have already tried (insurance, school)',
              'Lo que ya intentó (seguro, escuela)',
              'Những gì quý vị đã thử (bảo hiểm, nhà trường)'
            ),
            L(
              'Why those did not cover it',
              'Por qué esos no lo cubrieron',
              'Vì sao những nguồn đó không chi trả'
            ),
            L(
              'Ask to have the need written into the IPP',
              'Pida que la necesidad quede escrita en el IPP',
              'Đề nghị ghi nhu cầu vào IPP'
            ),
          ],
        },
      ],
      stage: 'seeking_help',
      primaryQuestion: L(
        'What can Regional Center money actually pay for?',
        '¿Qué puede pagar realmente el dinero del Centro Regional?',
        'Tiền của Trung tâm Khu vực thực sự chi trả cho gì?'
      ),
      relatedQuestions: [
        L('Does the Regional Center pay for diapers?', '¿El Centro Regional paga los pañales?', 'Trung tâm Khu vực có trả tiền tã không?'),
        L('Can I get respite through the Regional Center?', '¿Puedo obtener relevo a través del Centro Regional?', 'Tôi có thể nhận chăm sóc thay thế qua Trung tâm Khu vực không?'),
        L('Will they cover a camp or adaptive equipment?', '¿Cubrirán un campamento o equipo adaptado?', 'Họ có chi trả trại hè hoặc thiết bị thích ứng không?'),
        L('What are “generic resources” and why do they ask?', '¿Qué son los “recursos genéricos” y por qué preguntan?', '“Nguồn lực chung” là gì và vì sao họ hỏi?'),
        L('How do I get a need added to the IPP?', '¿Cómo agrego una necesidad al IPP?', 'Làm sao để thêm một nhu cầu vào IPP?'),
      ],
      bridge: {
        label: L('Help me figure out what to ask for', 'Ayúdame a saber qué pedir', 'Giúp tôi biết nên đề nghị gì'),
        blurb: L(
          'Tell me what your child needs and I’ll help you make the case.',
          'Dígame qué necesita su hijo/a y le ayudaré a presentar el caso.',
          'Hãy cho tôi biết con quý vị cần gì và tôi sẽ giúp trình bày.'
        ),
        seed: L(
          'I want to know what the Regional Center can pay for my child.',
          'Quiero saber qué puede pagar el Centro Regional para mi hijo/a.',
          'Tôi muốn biết Trung tâm Khu vực có thể chi trả gì cho con tôi.'
        ),
      },
      actionLabel: L('See what you can ask for', 'Ver qué puede pedir', 'Xem quý vị có thể đề nghị gì'),
      target: { screen: 'Reimbursables', tab: 'Home' },
      // The words a parent actually types when asking about money.
      terms: [
        'diapers', 'respite', 'camp', 'equipment', 'funding', 'fund', 'pay', 'pays',
        'cover', 'covers', 'money', 'sibling', 'sibshop', 'pañales', 'pagar', 'paga',
        'cubre', 'dinero', 'tã', 'chi trả', 'trả', 'tiền',
      ],
    },
    {
      key: 'sibling_support',
      title: L(
        'Sibling support: the Regional Center help most families never hear about',
        'Apoyo para hermanos: la ayuda del Centro Regional de la que casi nadie se entera',
        'Hỗ trợ anh chị em: sự trợ giúp của Trung tâm Khu vực mà hầu hết gia đình chưa nghe đến'
      ),
      // The catch, stated plainly: it exists, it's free, and it's invisible
      // until you ask — because it has to tie to a need in the IPP first.
      summary: L(
        'The Regional Center can fund Sibshops, sibling counseling, respite for 1:1 time, family recreation, and parent training — for the brothers and sisters. The catch: it isn’t automatic. It has to connect to an identified need in the IPP, so it’s about asking, not assuming.',
        'El Centro Regional puede financiar Sibshops, consejería para hermanos, relevo para tiempo a solas, recreación familiar y capacitación para padres — para los hermanos. El detalle: no es automático. Tiene que conectarse con una necesidad identificada en el IPP, así que se trata de pedir, no de suponer.',
        'Trung tâm Khu vực có thể tài trợ Sibshops, tư vấn cho anh chị em, chăm sóc thay thế để có thời gian riêng, giải trí gia đình và huấn luyện cha mẹ — cho anh chị em. Điều cần lưu ý: nó không tự động. Nó phải gắn với một nhu cầu được xác định trong IPP, nên đây là chuyện đề nghị, không phải mặc định có sẵn.'
      ),
      minutes: 5,
      citation: 'W&I §4646.5 · §4648(a)',
      body: [
        {
          kind: 'para',
          text: L(
            'When a child has a disability, their brothers and sisters carry something too — and the Regional Center can help. Sibshops (peer groups made just for siblings), counseling for a sibling’s own adjustment, respite that frees up one-on-one time, inclusive family recreation, and parent training on the sibling relationship can all be funded.',
            'Cuando un niño tiene una discapacidad, sus hermanos también cargan con algo — y el Centro Regional puede ayudar. Sibshops (grupos de pares hechos para hermanos), consejería para la adaptación de un hermano, relevo que libera tiempo a solas, recreación familiar inclusiva y capacitación para padres sobre la relación entre hermanos pueden financiarse.',
            'Khi một trẻ có khuyết tật, anh chị em của bé cũng gánh vác điều gì đó — và Trung tâm Khu vực có thể giúp. Sibshops (nhóm bạn dành riêng cho anh chị em), tư vấn cho sự thích nghi của anh chị em, chăm sóc thay thế giúp có thời gian riêng, giải trí gia đình hòa nhập, và huấn luyện cha mẹ về mối quan hệ anh chị em đều có thể được tài trợ.'
          ),
        },
        {
          kind: 'callout',
          text: L(
            'The catch: it’s not automatic. A coordinator rarely offers it. It has to connect to an identified need in the IPP — so the move is getting that need written into the plan.',
            'El detalle: no es automático. Un coordinador rara vez lo ofrece. Tiene que conectarse con una necesidad identificada en el IPP — así que el paso es lograr que esa necesidad quede escrita en el plan.',
            'Điều cần lưu ý: nó không tự động. Điều phối viên hiếm khi đề nghị. Nó phải gắn với một nhu cầu được xác định trong IPP — nên việc cần làm là đưa nhu cầu đó vào kế hoạch.'
          ),
        },
        {
          kind: 'para',
          text: L(
            'What the IPP lists, the Regional Center has to secure. So sibling support starts the same way every family support does: name the need, ask to have it written into the plan, and request the support by name.',
            'Lo que el IPP incluye, el Centro Regional debe conseguirlo. Así que el apoyo para hermanos empieza igual que todo apoyo familiar: nombre la necesidad, pida que quede escrita en el plan y solicite el apoyo por su nombre.',
            'Điều gì IPP ghi, Trung tâm Khu vực phải bảo đảm. Vì vậy hỗ trợ anh chị em bắt đầu như mọi hỗ trợ gia đình khác: nêu nhu cầu, đề nghị ghi vào kế hoạch, và yêu cầu hỗ trợ theo tên.'
          ),
        },
        {
          kind: 'checklist',
          label: L(
            'Bring this to the IPP meeting',
            'Lleve esto a la reunión del IPP',
            'Mang điều này đến buổi họp IPP'
          ),
          items: [
            L(
              'The sibling’s need — anxious, withdrawn, or carrying too much',
              'La necesidad del hermano — ansioso, retraído o cargando demasiado',
              'Nhu cầu của anh chị em — lo lắng, thu mình hoặc gánh quá nhiều'
            ),
            L(
              'That you’d like it noted as a family need in the plan',
              'Que le gustaría que se anote como una necesidad familiar en el plan',
              'Rằng quý vị muốn ghi nhận đó là nhu cầu của gia đình trong kế hoạch'
            ),
            L(
              'The support you’re asking for by name — a Sibshop, counseling, respite',
              'El apoyo que pide por su nombre — un Sibshop, consejería, relevo',
              'Hỗ trợ quý vị đề nghị theo tên — một Sibshop, tư vấn, chăm sóc thay thế'
            ),
          ],
        },
      ],
      stage: 'advocating',
      primaryQuestion: L(
        'Can the Regional Center fund support for my child’s siblings?',
        '¿El Centro Regional puede financiar apoyo para los hermanos de mi hijo?',
        'Trung tâm Khu vực có thể tài trợ hỗ trợ cho anh chị em của con tôi không?'
      ),
      relatedQuestions: [
        L('What is a Sibshop?', '¿Qué es un Sibshop?', 'Sibshop là gì?'),
        L('Can a sibling get counseling through the Regional Center?', '¿Un hermano puede recibir consejería a través del Centro Regional?', 'Anh chị em có thể nhận tư vấn qua Trung tâm Khu vực không?'),
        L('How do I get a family need written into the IPP?', '¿Cómo agrego una necesidad familiar al IPP?', 'Làm sao để ghi một nhu cầu gia đình vào IPP?'),
        L('Does respite count as sibling support?', '¿El relevo cuenta como apoyo para hermanos?', 'Chăm sóc thay thế có tính là hỗ trợ anh chị em không?'),
        L('What if the coordinator says it’s not offered?', '¿Y si el coordinador dice que no se ofrece?', 'Nếu điều phối viên nói không có thì sao?'),
      ],
      bridge: {
        label: L('Help me ask for sibling support', 'Ayúdame a pedir apoyo para hermanos', 'Giúp tôi đề nghị hỗ trợ anh chị em'),
        blurb: L(
          'Tell me what your other child is going through and I’ll help you make the case.',
          'Dígame por lo que está pasando su otro hijo/a y le ayudaré a presentar el caso.',
          'Hãy cho tôi biết con còn lại của quý vị đang trải qua điều gì và tôi sẽ giúp trình bày.'
        ),
        seed: L(
          'I want to ask the Regional Center for sibling support for my child’s brother or sister.',
          'Quiero pedirle al Centro Regional apoyo para el hermano o la hermana de mi hijo/a.',
          'Tôi muốn đề nghị Trung tâm Khu vực hỗ trợ cho anh chị em của con tôi.'
        ),
      },
      actionLabel: L('See the supports you can ask for', 'Ver los apoyos que puede pedir', 'Xem các hỗ trợ quý vị có thể đề nghị'),
      target: { screen: 'Reimbursables', tab: 'Home' },
      terms: [
        'sibling', 'siblings', 'sibshop', 'sibshops', 'brother', 'sister', 'counseling',
        'therapy', 'family support', 'hermano', 'hermana', 'hermanos', 'consejería',
        'anh chị em', 'anh', 'chị', 'em', 'tư vấn', 'hỗ trợ gia đình',
      ],
    },
    {
      key: 'first_iep',
      title: L(
        'Your first IEP meeting, start to finish',
        'Su primera reunión de IEP, de principio a fin',
        'Buổi họp IEP đầu tiên, từ đầu đến cuối'
      ),
      summary: L(
        'The assessment plan is due within 15 days of your written request, and the meeting follows the assessment. Ask in writing, keep the date, and bring the one thing schools respond to: your own record of what you asked for and when.',
        'El plan de evaluación vence a los 15 días de su solicitud por escrito, y la reunión sigue a la evaluación. Pida por escrito, guarde la fecha y lleve lo único a lo que las escuelas responden: su propio registro de qué pidió y cuándo.',
        'Kế hoạch đánh giá phải có trong vòng 15 ngày kể từ yêu cầu bằng văn bản, và buổi họp diễn ra sau khi đánh giá. Hãy đề nghị bằng văn bản, giữ lại ngày tháng, và mang theo điều duy nhất nhà trường đáp lại: hồ sơ của chính quý vị về việc đã đề nghị gì và khi nào.'
      ),
      minutes: 9,
      citation: 'Ed Code §56321',
      body: [
        {
          kind: 'para',
          text: L(
            'An IEP starts with an assessment, and the assessment starts with your written request. Once the school has it, the district owes you an assessment plan within 15 days — the document that says what will be tested and asks your consent.',
            'Un IEP empieza con una evaluación, y la evaluación empieza con su solicitud por escrito. Una vez que la escuela la tiene, el distrito le debe un plan de evaluación en 15 días — el documento que dice qué se evaluará y pide su consentimiento.',
            'Một IEP bắt đầu bằng việc đánh giá, và việc đánh giá bắt đầu bằng yêu cầu bằng văn bản của quý vị. Khi nhà trường nhận được, học khu nợ quý vị một kế hoạch đánh giá trong vòng 15 ngày — văn bản nêu sẽ kiểm tra gì và xin sự đồng ý của quý vị.'
          ),
        },
        {
          kind: 'para',
          text: L(
            'The meeting follows the assessment — so the date you ask in writing is what sets everything after it in motion. A conversation at pickup does not start the clock; a dated request does.',
            'La reunión sigue a la evaluación — así que la fecha en que pide por escrito es lo que pone en marcha todo lo demás. Una conversación a la salida no inicia el plazo; una solicitud con fecha sí.',
            'Buổi họp diễn ra sau khi đánh giá — nên ngày quý vị đề nghị bằng văn bản là điều khởi động mọi thứ tiếp theo. Một cuộc trò chuyện lúc đón con không bắt đầu thời hạn; một yêu cầu có ghi ngày thì có.'
          ),
        },
        {
          kind: 'callout',
          text: L(
            'Bring the one thing schools respond to: your own record of what you asked for and when. Keep it friendly and factual — a dated request — and let the timeline do the persuading.',
            'Lleve lo único a lo que las escuelas responden: su propio registro de qué pidió y cuándo. Manténgalo amable y factual — una solicitud con fecha — y deje que el calendario persuada.',
            'Hãy mang theo điều duy nhất nhà trường đáp lại: hồ sơ của chính quý vị về việc đã đề nghị gì và khi nào. Giữ giọng thân thiện và rõ ràng — một đề nghị có ghi ngày — và để dòng thời gian thuyết phục.'
          ),
        },
        {
          kind: 'checklist',
          label: L(
            'Bring these to the IEP meeting',
            'Lleve esto a la reunión del IEP',
            'Mang những điều này đến buổi họp IEP'
          ),
          items: [
            L(
              'Your dated written request for evaluation',
              'Su solicitud de evaluación por escrito, con fecha',
              'Yêu cầu đánh giá bằng văn bản có ghi ngày của quý vị'
            ),
            L(
              'Any private reports or evaluations you have',
              'Cualquier informe o evaluación privada que tenga',
              'Bất kỳ báo cáo hoặc đánh giá riêng nào quý vị có'
            ),
            L(
              'A short list of what you see at home',
              'Una lista breve de lo que observa en casa',
              'Danh sách ngắn về những gì quý vị thấy ở nhà'
            ),
            L(
              'Your top three concerns, written down',
              'Sus tres preocupaciones principales, por escrito',
              'Ba mối lo hàng đầu của quý vị, viết ra'
            ),
          ],
        },
      ],
      stage: 'seeking_help',
      primaryQuestion: L(
        'How do I get my child’s first IEP meeting?',
        '¿Cómo consigo la primera reunión de IEP de mi hijo/a?',
        'Làm sao để có buổi họp IEP đầu tiên cho con tôi?'
      ),
      relatedQuestions: [
        L('How do I request a school evaluation?', '¿Cómo solicito una evaluación escolar?', 'Làm sao để yêu cầu nhà trường đánh giá?'),
        L('How long does the school have to respond?', '¿Cuánto tiempo tiene la escuela para responder?', 'Nhà trường có bao lâu để trả lời?'),
        L('What is an assessment plan?', '¿Qué es un plan de evaluación?', 'Kế hoạch đánh giá là gì?'),
        L('What should I bring to an IEP meeting?', '¿Qué debo llevar a una reunión de IEP?', 'Tôi nên mang gì đến buổi họp IEP?'),
        L('What if the school says my child doesn’t qualify?', '¿Y si la escuela dice que mi hijo/a no califica?', 'Nếu nhà trường nói con tôi không đủ điều kiện thì sao?'),
      ],
      bridge: {
        label: L('Help me figure out my next step', 'Ayúdame a saber mi próximo paso', 'Giúp tôi tìm bước tiếp theo'),
        blurb: L(
          'Tell me what’s going on at school and I’ll help you prepare.',
          'Dígame qué pasa en la escuela y le ayudaré a prepararse.',
          'Hãy cho tôi biết chuyện gì đang xảy ra ở trường và tôi sẽ giúp quý vị chuẩn bị.'
        ),
        seed: L(
          'My child is struggling at school and I think we might need an IEP.',
          'Mi hijo/a tiene dificultades en la escuela y creo que quizá necesitemos un IEP.',
          'Con tôi gặp khó khăn ở trường và tôi nghĩ chúng tôi có thể cần một IEP.'
        ),
      },
      actionLabel: L(
        'Write the evaluation request',
        'Escribir la solicitud de evaluación',
        'Viết yêu cầu đánh giá'
      ),
      target: { screen: 'Letters', params: { template: 'assessment_request' }, tab: 'Home' },
      terms: ['iep', 'evaluation', 'assessment', 'school', 'evaluación', 'đánh giá'],
    },
  ];
}

/** One article by key, in the given locale, or null — for the reader screen. */
export function getLearnArticle(
  key: string,
  locale: FunnelLocale = 'en'
): LearnArticle | null {
  return getLearnArticles(locale).find((a) => a.key === key) ?? null;
}

export function getGlossary(locale: FunnelLocale = 'en'): GlossaryEntry[] {
  const L = picker(locale);
  return [
    {
      term: 'IPP',
      plain: L(
        'Your Regional Center service plan. You can ask for a review at any time: it must be held within 30 days of your request, or within 7 if waiting would put your child’s health or safety at risk.',
        'Su plan de servicios del Centro Regional. Puede pedir una revisión en cualquier momento: debe realizarse dentro de 30 días de su solicitud, o dentro de 7 si esperar pondría en riesgo la salud o la seguridad de su hijo/a.',
        'Kế hoạch dịch vụ của Trung tâm Khu vực. Quý vị có thể yêu cầu xem lại bất cứ lúc nào: phải tổ chức trong vòng 30 ngày kể từ khi đề nghị, hoặc trong vòng 7 ngày nếu chờ đợi sẽ gây rủi ro cho sức khỏe hoặc an toàn của con quý vị.'
      ),
      citation: 'W&I §4646 · §4646.5(b)',
      terms: ['individual program plan', 'plan'],
    },
    {
      term: 'IEP',
      plain: L(
        "The school's written plan for your child's goals and services.",
        'El plan escrito de la escuela para las metas y servicios de su hijo/a.',
        'Kế hoạch bằng văn bản của trường về mục tiêu và dịch vụ cho con quý vị.'
      ),
      citation: 'IDEA · Ed Code §56341',
      terms: ['individualized education program', 'school plan'],
    },
    {
      term: 'NOA',
      plain: L(
        'Notice of Action — the written decision that starts your appeal rights.',
        'Aviso de Acción — la decisión escrita que inicia sus derechos de apelación.',
        'Thông báo Hành động — quyết định bằng văn bản mở ra quyền kháng nghị của quý vị.'
      ),
      citation: 'W&I §4710.5',
      terms: ['notice of action', 'denial', 'appeal'],
    },
    {
      term: 'POS',
      plain: L(
        'Purchase of Service — Regional Center money spent on a service for your child.',
        'Compra de Servicio — dinero del Centro Regional gastado en un servicio para su hijo/a.',
        'Mua Dịch vụ — tiền Trung tâm Khu vực chi cho một dịch vụ cho con quý vị.'
      ),
      terms: ['purchase of service', 'funding'],
    },
    {
      term: 'SDP',
      plain: L(
        'Self-Determination — you direct an individual budget instead of Regional Center-chosen vendors.',
        'Autodeterminación — usted dirige un presupuesto individual en lugar de proveedores elegidos por el Centro Regional.',
        'Tự Quyết — quý vị tự điều phối ngân sách cá nhân thay vì nhà cung cấp do Trung tâm Khu vực chọn.'
      ),
      citation: 'W&I §4685.8',
      terms: ['self determination', 'budget'],
    },
    {
      term: 'Early Start',
      plain: L(
        'Services for children under 3, on a 45-day clock from referral.',
        'Servicios para niños menores de 3 años, con un plazo de 45 días desde la remisión.',
        'Dịch vụ cho trẻ dưới 3 tuổi, với thời hạn 45 ngày kể từ khi giới thiệu.'
      ),
      // The 45-day clock is federal, and has its own registry entry.
      citation: '34 CFR §303.310 · Early Start',
      terms: ['early intervention', 'under 3', 'birth to three'],
    },
  ];
}

export function getLearnLibrary(locale: FunnelLocale = 'en'): LearnLibrary {
  return {
    paths: getLearnPaths(locale),
    articles: getLearnArticles(locale),
    glossary: getGlossary(locale),
  };
}

export type LearnHitKind = 'path' | 'article' | 'glossary';

export interface LearnHit {
  kind: LearnHitKind;
  key: string;
  title: string;
  /** One line under the title — the summary, description or definition. */
  detail: string;
  citation?: string;
  actionLabel?: string;
  /**
   * Absent for a glossary answer: the definition IS the answer, so the row
   * is read, not tapped. A row that looks like a button and does nothing is
   * worse than a row that never claimed to be one.
   */
  target?: LearnTarget;
}

/** Accent- and case-insensitive, so "que es un IPP" matches "qué". */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // đ/Đ have no decomposition, so the split below treated them as
    // separators: "đánh giá" tokenized to ["anh", "gia"].
    .replace(/[đĐ]/g, 'd');
}

/**
 * Words that carry no signal in a typed question. Without this, "what is an
 * IPP" matches every entry containing "is" and the ranking is noise.
 */
const STOP_WORDS = new Set([
  'what', 'whats', 'is', 'a', 'an', 'the', 'my', 'me', 'do', 'does', 'i', 'to', 'for', 'of',
  'how', 'can', 'in', 'on', 'and', 'or',
  'que', 'qué', 'es', 'un', 'una', 'el', 'la', 'los', 'las', 'mi', 'como', 'cómo', 'de', 'para',
  'la', 'gi', 'gì', 'là', 'cua', 'của', 'toi', 'tôi', 'lam', 'làm', 'sao',
]);

/** Whole-word match, so "no" does not match "notice" or "nothing". */
function matchesWord(hay: string, term: string): boolean {
  if (!hay) return false;
  const i = hay.indexOf(term);
  if (i < 0) return false;
  const before = i === 0 ? ' ' : hay[i - 1];
  const after = hay[i + term.length] ?? ' ';
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
}

/**
 * The library answers before the AI has to. A parent typing "what is an IPP"
 * into Ask should see the glossary entry, not a spinner.
 */
export function searchLearn(query: string, locale: FunnelLocale = 'en'): LearnHit[] {
  const terms = fold(query)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  if (terms.length === 0) return [];

  const lib = getLearnLibrary(locale);
  const scored: { hit: LearnHit; score: number }[] = [];

  /**
   * Weighted by where the word appears. A title or a search term is what the
   * entry is ABOUT; a summary merely mentions it. Flat scoring put "The
   * 30-day IPP clock" above "when the Regional Center says no" for the query
   * "they said no on the phone", because the clock article's summary happened
   * to contain the phrase.
   */
  const consider = (
    hit: LearnHit,
    fields: { title: string; terms: string[]; body: string; exact: string }
  ) => {
    const title = fold(fields.title);
    const termsHay = fold(fields.terms.join(' '));
    const body = fold(fields.body);
    const exactFolded = fold(fields.exact);
    let score = 0;
    let matched = 0;
    for (const t of terms) {
      let best = 0;
      // An exact key match — "ipp", "noa" — is what a parent actually typed.
      if (exactFolded === t) best = 12;
      else if (matchesWord(termsHay, t)) best = 6;
      else if (matchesWord(title, t)) best = 4;
      else if (matchesWord(body, t)) best = 1;
      if (best > 0) {
        score += best;
        matched += 1;
      }
    }
    // Covering more of what was typed beats matching one word loudly.
    if (score > 0) scored.push({ hit, score: score + matched * 2 });
  };

  

  for (const g of lib.glossary) {
    consider(
      {
        kind: 'glossary',
        key: g.term,
        title: g.term,
        detail: g.plain,
        citation: g.citation,
      },
      { title: g.term, terms: g.terms, body: g.plain, exact: g.term }
    );
  }
  for (const a of lib.articles) {
    consider(
      {
        kind: 'article',
        key: a.key,
        title: a.title,
        detail: a.summary,
        citation: a.citation,
        actionLabel: a.actionLabel,
        target: a.target,
      },
      { title: a.title, terms: a.terms, body: a.summary, exact: a.key }
    );
  }
  for (const p of lib.paths) {
    consider(
      {
        kind: 'path',
        key: p.key,
        title: p.title,
        detail: p.description,
        target: p.target,
      },
      { title: p.title, terms: p.terms, body: p.description, exact: p.key }
    );
  }

  return scored
    .sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title))
    .map((s) => s.hit);
}

/** The four questions families actually open the app with. */
export function popularQuestions(locale: FunnelLocale = 'en'): string[] {
  const L = picker(locale);
  return [
    L('What is an IPP?', '¿Qué es un IPP?', 'IPP là gì?'),
    L(
      'They said no on the phone — now what?',
      'Dijeron que no por teléfono — ¿y ahora?',
      'Họ từ chối qua điện thoại — giờ sao?'
    ),
    L(
      'What can the Regional Center pay for?',
      '¿Qué puede pagar el Centro Regional?',
      'Trung tâm Khu vực có thể chi trả cho gì?'
    ),
    L(
      'How do I ask for an IEP evaluation?',
      '¿Cómo pido una evaluación de IEP?',
      'Làm sao để đề nghị đánh giá IEP?'
    ),
  ];
}

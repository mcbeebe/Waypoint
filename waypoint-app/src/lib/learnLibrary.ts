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
  tab?: string;
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

export interface LearnArticle {
  key: string;
  title: string;
  /** The two or three sentences a parent needs before the action. */
  summary: string;
  /** Roughly how long it takes to read — honest, not padded. */
  minutes: number;
  /** Legal basis, when the article makes a legal claim. Never translated. */
  citation?: string;
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
      target: { screen: 'ProcessMap', params: { system: 'rc' } },
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
      target: { screen: 'ProcessMap', params: { system: 'school' } },
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
      target: { screen: 'ResourceStack' },
      terms: ['medi-cal', 'ihss', 'ssi', 'money', 'benefits', 'dinero', 'tiền'],
    },
    {
      key: 'journey',
      icon: 'map-outline',
      title: L('The journey, age by age', 'El camino, edad por edad', 'Hành trình, theo từng độ tuổi'),
      description: L(
        "What is coming next, through transition and turning 18.",
        'Lo que viene después, hasta la transición y los 18 años.',
        'Điều sắp tới, qua giai đoạn chuyển tiếp và tuổi 18.'
      ),
      target: { screen: 'Journey' },
      terms: ['journey', 'transition', 'age 18', 'camino', 'hành trình'],
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
      target: { screen: 'EscalationLadder' },
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
        'A spoken no is not a decision. Ask for it in writing: a Notice of Action states the reason and starts the clock on your appeal rights. Most families never ask, and the denial simply stands.',
        'Un no hablado no es una decisión. Pídalo por escrito: un Aviso de Acción indica el motivo e inicia el plazo de sus derechos de apelación. La mayoría de las familias nunca lo pide, y la negación simplemente queda.',
        'Lời từ chối bằng miệng không phải là một quyết định. Hãy yêu cầu bằng văn bản: Thông báo Hành động nêu lý do và bắt đầu thời hạn quyền kháng nghị của quý vị. Hầu hết gia đình không yêu cầu, và lời từ chối cứ thế tồn tại.'
      ),
      minutes: 6,
      citation: 'W&I §4710.5 · §4731',
      actionLabel: L(
        'Ask for it in writing',
        'Pedirlo por escrito',
        'Yêu cầu bằng văn bản'
      ),
      target: { screen: 'Letters', params: { template: 'noa_request' } },
      terms: ['denied', 'no', 'noa', 'notice of action', 'appeal', 'negado', 'từ chối'],
    },
    {
      key: 'ipp_clock',
      title: L(
        'The 30-day IPP clock, explained',
        'El plazo de 30 días del IPP, explicado',
        'Đồng hồ 30 ngày của IPP, giải thích'
      ),
      summary: L(
        'When you ask for an IPP meeting, the Regional Center has 30 days to hold it. The clock runs from your request — which is why the date you asked matters more than anything you said on the phone.',
        'Cuando pide una reunión de IPP, el Centro Regional tiene 30 días para realizarla. El plazo corre desde su solicitud — por eso la fecha en que pidió importa más que lo que dijo por teléfono.',
        'Khi quý vị đề nghị họp IPP, Trung tâm Khu vực có 30 ngày để tổ chức. Thời hạn tính từ ngày quý vị đề nghị — vì vậy ngày đề nghị quan trọng hơn bất cứ điều gì nói qua điện thoại.'
      ),
      minutes: 4,
      citation: 'W&I §4646.5(b)',
      actionLabel: L('Track this request', 'Registrar esta solicitud', 'Theo dõi yêu cầu này'),
      target: { screen: 'RequestTracker' },
      terms: ['ipp', '30 days', 'clock', 'meeting', 'plazo', 'thời hạn'],
    },
    {
      key: 'rc_money',
      title: L(
        'Diapers, strollers, camps: what Regional Center money actually covers',
        'Pañales, coches, campamentos: qué cubre realmente el dinero del Centro Regional',
        'Tã, xe đẩy, trại hè: tiền của Trung tâm Khu vực thực sự chi trả cho gì'
      ),
      summary: L(
        'Regional Centers can fund far more than services: diapers past toilet-training age, adaptive equipment, respite, and camps. Most families are never told, because nothing requires anyone to tell them.',
        'Los Centros Regionales pueden financiar mucho más que servicios: pañales pasada la edad de entrenamiento, equipo adaptado, respiro y campamentos. A la mayoría de las familias nunca se lo dicen, porque nada obliga a nadie a decirlo.',
        'Trung tâm Khu vực có thể tài trợ nhiều hơn dịch vụ: tã sau tuổi tập vệ sinh, thiết bị thích ứng, chăm sóc thay thế và trại hè. Hầu hết gia đình không được cho biết, vì không quy định nào buộc ai phải nói.'
      ),
      minutes: 7,
      citation: 'W&I §4646.5 · §4648(a)',
      actionLabel: L('See what you can ask for', 'Ver qué puede pedir', 'Xem quý vị có thể đề nghị gì'),
      target: { screen: 'Reimbursables' },
      terms: ['diapers', 'respite', 'camp', 'equipment', 'funding', 'pañales', 'tã'],
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
      actionLabel: L(
        'Write the evaluation request',
        'Escribir la solicitud de evaluación',
        'Viết yêu cầu đánh giá'
      ),
      target: { screen: 'Letters', params: { template: 'assessment_request' } },
      terms: ['iep', 'evaluation', 'assessment', 'school', 'evaluación', 'đánh giá'],
    },
  ];
}

export function getGlossary(locale: FunnelLocale = 'en'): GlossaryEntry[] {
  const L = picker(locale);
  return [
    {
      term: 'IPP',
      plain: L(
        'Your Regional Center service plan — reviewed at least once a year.',
        'Su plan de servicios del Centro Regional — revisado al menos una vez al año.',
        'Kế hoạch dịch vụ của Trung tâm Khu vực — xem lại ít nhất mỗi năm một lần.'
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
      citation: 'IDEA Part C · Early Start',
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
  target: LearnTarget;
}

/** Accent- and case-insensitive, so "que es un IPP" matches "qué". */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
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

  const consider = (hit: LearnHit, haystacks: string[], exact: string) => {
    const hay = fold(haystacks.join(' '));
    const exactFolded = fold(exact);
    let score = 0;
    for (const t of terms) {
      // An exact term match — "ipp", "noa" — is what a parent actually typed.
      if (exactFolded === t) score += 10;
      else if (hay.includes(t)) score += 1;
    }
    if (score > 0) scored.push({ hit, score });
  };

  for (const g of lib.glossary) {
    consider(
      {
        kind: 'glossary',
        key: g.term,
        title: g.term,
        detail: g.plain,
        citation: g.citation,
        target: { screen: 'Learn', params: { term: g.term } },
      },
      [g.term, g.plain, ...g.terms],
      g.term
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
      [a.title, a.summary, ...a.terms],
      a.key
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
      [p.title, p.description, ...p.terms],
      p.key
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

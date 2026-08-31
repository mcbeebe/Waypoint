/**
 * Family supports you have to ask for (initiative 005).
 *
 * A tier of Regional-Center-funded supports — sibling groups (Sibshops),
 * sibling counseling, respite, family recreation, parent training — that a
 * coordinator rarely offers unprompted. The catch a parent flagged exactly:
 * they are NOT automatic. Each has to connect to an identified need written
 * into the IPP (W&I §4646.5 / §4648(a)), so getting one is advocacy, not a
 * form.
 *
 * This models that advocacy once — WHAT it is · THE CATCH (why it isn't
 * automatic) · HOW TO ASK (collaborative steps) · the SCRIPT · the IPP-need
 * hook — so every support in the tier reuses the same shape. Sibling support is
 * the first fully-authored instance.
 *
 * Tone (owner rule): collaborative-first. Every string is an *ask*, never a
 * demand; the framing states the situation ("it's not automatic"), never blames
 * an actor. It firms up only on the escalation ladder, elsewhere.
 *
 * Pure — no react-native, no supabase — so content, parity and the "every
 * support carries the catch" rule are unit-testable. Trilingual via the same
 * `L()` picker the rest of the content layer uses. Citations never translate.
 */
import type { FunnelLocale } from '@/lib/eligibility';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export interface FamilySupport {
  /** Stable id, e.g. 'sibling_support'. */
  key: string;
  /** Ionicons name for the row and detail header. */
  icon: string;
  /** The support's name, in the parent's words. */
  name: string;
  /** One line under the name on the list row. */
  tagline: string;
  /** Plain-language "what this actually is". */
  whatItIs: string;
  /**
   * Why it isn't automatic — the catch. States the situation (a coordinator
   * rarely offers it; it must tie to an identified need in the IPP), never
   * blames.
   */
  theCatch: string;
  /** The collaborative ask, step by step. Three short steps. */
  howToAsk: string[];
  /**
   * A sample first-person ask for the IPP meeting — friendly, collaborative.
   * Uses a placeholder name the caller substitutes with the child's.
   */
  script: string;
  /**
   * The need language to get written into the plan — what "identified need"
   * looks like for THIS support, so the parent knows exactly what to ask to
   * have recorded.
   */
  ippNeedHook: string;
  /** POS billing code(s), so a parent can ask by name. Omitted when it varies. */
  code?: string;
  /** Legal basis. Never translated. */
  citation: string;
  /** Extra plain-language words search should match. */
  terms: string[];
}

/**
 * The family-support tier, localized. Sibling support leads (it is absent from
 * the app today); respite, camp/family recreation and parent training reuse the
 * same shape. Every entry carries a catch — the `familySupports.test.ts`
 * discipline enforces it.
 */
export function getFamilySupports(locale: FunnelLocale = 'en'): FamilySupport[] {
  const L = picker(locale);
  const RC_CITE = 'W&I §4646.5 · §4648(a)';

  return [
    {
      key: 'sibling_support',
      icon: 'people-circle-outline',
      name: L('Sibling support', 'Apoyo para hermanos', 'Hỗ trợ anh chị em'),
      tagline: L(
        'Sibshops, counseling and groups for the brothers and sisters — their needs count too.',
        'Sibshops, consejería y grupos para los hermanos — sus necesidades también cuentan.',
        'Sibshops, tư vấn và nhóm cho anh chị em — nhu cầu của các em cũng quan trọng.'
      ),
      whatItIs: L(
        'When it connects to your child’s own support, the Regional Center can fund Sibshops (peer groups made just for siblings), counseling for a sibling’s adjustment, respite that frees up one-on-one time, and parent training on the sibling relationship. That tie to your child’s needs is what makes it fundable — which is why it runs through the IPP.',
        'Cuando se conecta con el propio apoyo de su hijo, el Centro Regional puede financiar Sibshops (grupos de pares hechos para hermanos), consejería para la adaptación de un hermano, relevo que libera tiempo a solas, y capacitación para padres sobre la relación entre hermanos. Ese vínculo con las necesidades de su hijo es lo que lo hace financiable — por eso pasa por el IPP.',
        'Khi nó gắn với việc hỗ trợ chính con quý vị, Trung tâm Khu vực có thể tài trợ Sibshops (nhóm bạn dành riêng cho anh chị em), tư vấn cho sự thích nghi của anh chị em, chăm sóc thay thế giúp có thời gian riêng, và huấn luyện cha mẹ về mối quan hệ anh chị em. Chính mối liên kết với nhu cầu của con quý vị làm cho nó được tài trợ — đó là lý do nó đi qua IPP.'
      ),
      theCatch: L(
        'It’s not automatic. A coordinator rarely offers it. It has to connect to an identified need in the IPP — so the whole move is getting that need written into the plan.',
        'No es automático. Un coordinador rara vez lo ofrece. Tiene que conectarse con una necesidad identificada en el IPP — así que todo el asunto es lograr que esa necesidad quede escrita en el plan.',
        'Nó không tự động. Điều phối viên hiếm khi đề nghị. Nó phải gắn với một nhu cầu được xác định trong IPP — nên toàn bộ việc cần làm là đưa nhu cầu đó vào kế hoạch.'
      ),
      howToAsk: [
        L(
          'Name the need: a sibling who’s anxious, withdrawn, or carrying too much.',
          'Nombre la necesidad: un hermano ansioso, retraído o que carga con demasiado.',
          'Nêu nhu cầu: một anh chị em lo lắng, thu mình hoặc phải gánh quá nhiều.'
        ),
        L(
          'Ask to have it noted as a family need in the IPP.',
          'Pida que se anote como una necesidad familiar en el IPP.',
          'Đề nghị ghi nhận đó là nhu cầu của gia đình trong IPP.'
        ),
        L(
          'Request sibling support to meet it — by name (a Sibshop, counseling).',
          'Solicite apoyo para hermanos para atenderla — por su nombre (un Sibshop, consejería).',
          'Yêu cầu hỗ trợ anh chị em để đáp ứng — theo tên (một Sibshop, tư vấn).'
        ),
      ],
      script: L(
        'I’d like to add a note to {child}’s IPP: their sibling has been struggling with the diagnosis. Could we look at sibling support — a Sibshop or counseling — as part of our family’s plan?',
        'Me gustaría agregar una nota al IPP de {child}: su hermano/a ha estado batallando con el diagnóstico. ¿Podríamos considerar apoyo para hermanos — un Sibshop o consejería — como parte del plan de nuestra familia?',
        'Tôi muốn thêm một ghi chú vào IPP của {child}: anh chị em của bé đang gặp khó khăn với chẩn đoán. Chúng ta có thể xem xét hỗ trợ anh chị em — một Sibshop hoặc tư vấn — như một phần trong kế hoạch của gia đình không?'
      ),
      ippNeedHook: L(
        'The sibling’s adjustment and wellbeing is a family need affecting the child’s support.',
        'La adaptación y el bienestar del hermano es una necesidad familiar que afecta el apoyo del niño.',
        'Sự thích nghi và an sinh của anh chị em là nhu cầu gia đình ảnh hưởng đến việc hỗ trợ trẻ.'
      ),
      citation: RC_CITE,
      terms: [
        'sibling', 'siblings', 'sibshop', 'sibshops', 'brother', 'sister', 'counseling',
        'therapy for sibling', 'hermano', 'hermana', 'hermanos', 'consejería',
        'anh chị em', 'anh', 'chị', 'em', 'tư vấn',
      ],
    },
    {
      key: 'respite',
      icon: 'bed-outline',
      name: L('Respite', 'Relevo (respiro)', 'Chăm sóc thay thế'),
      tagline: L(
        'In-home or out-of-home breaks — one of the most-used RC services, still often unoffered.',
        'Descansos en casa o fuera de casa — uno de los servicios del CR más usados, aún poco ofrecido.',
        'Nghỉ ngơi tại nhà hoặc ngoài nhà — một trong những dịch vụ TTKV được dùng nhiều nhất, vẫn ít được đề nghị.'
      ),
      whatItIs: L(
        'Paid care that gives you a break — in your home or out of it — and can free up one-on-one time with a sibling. One of the most-used Regional Center services.',
        'Cuidado pagado que le da un descanso — en su casa o fuera — y puede liberar tiempo a solas con un hermano. Uno de los servicios del Centro Regional más usados.',
        'Dịch vụ chăm sóc có trả phí giúp quý vị nghỉ ngơi — tại nhà hoặc ngoài nhà — và có thể tạo thời gian riêng với anh chị em. Một trong những dịch vụ Trung tâm Khu vực được dùng nhiều nhất.'
      ),
      theCatch: L(
        'It’s not automatic, and a parent can’t be the paid respite provider for their own child. It has to tie to a need in the IPP — usually caregiver relief — to be secured.',
        'No es automático, y un padre no puede ser el proveedor de relevo pagado de su propio hijo. Tiene que ligarse a una necesidad en el IPP — normalmente el descanso del cuidador — para conseguirse.',
        'Nó không tự động, và cha mẹ không thể là người cung cấp chăm sóc thay thế có trả phí cho chính con mình. Nó phải gắn với một nhu cầu trong IPP — thường là sự nghỉ ngơi của người chăm sóc — để được bảo đảm.'
      ),
      howToAsk: [
        L(
          'Name the need: the hours of care and the toll on the family.',
          'Nombre la necesidad: las horas de cuidado y el desgaste en la familia.',
          'Nêu nhu cầu: số giờ chăm sóc và gánh nặng lên gia đình.'
        ),
        L(
          'Ask to have caregiver relief noted as a need in the IPP.',
          'Pida que el descanso del cuidador se anote como necesidad en el IPP.',
          'Đề nghị ghi nhận sự nghỉ ngơi của người chăm sóc là nhu cầu trong IPP.'
        ),
        L(
          'Request respite hours to meet it, by name.',
          'Solicite horas de relevo para atenderla, por su nombre.',
          'Yêu cầu số giờ chăm sóc thay thế để đáp ứng, theo tên.'
        ),
      ],
      script: L(
        'I’d like to talk about respite in {child}’s IPP. The level of care at home is a lot for our family — could we note caregiver relief as a need and look at respite hours?',
        'Me gustaría hablar del relevo en el IPP de {child}. El nivel de cuidado en casa es mucho para nuestra familia — ¿podríamos anotar el descanso del cuidador como necesidad y considerar horas de relevo?',
        'Tôi muốn nói về chăm sóc thay thế trong IPP của {child}. Mức độ chăm sóc tại nhà là rất nhiều với gia đình — chúng ta có thể ghi nhận sự nghỉ ngơi của người chăm sóc là nhu cầu và xem xét số giờ chăm sóc thay thế không?'
      ),
      ippNeedHook: L(
        'Caregiver relief is a need given the level of support the child requires at home.',
        'El descanso del cuidador es una necesidad dado el nivel de apoyo que el niño requiere en casa.',
        'Sự nghỉ ngơi của người chăm sóc là nhu cầu do mức hỗ trợ trẻ cần tại nhà.'
      ),
      code: '862/868',
      citation: RC_CITE,
      terms: [
        'respite', 'break', 'caregiver', 'relief', 'relevo', 'respiro', 'descanso',
        'cuidador', 'chăm sóc thay thế', 'nghỉ ngơi', 'người chăm sóc',
      ],
    },
    {
      key: 'camp_recreation',
      icon: 'sunny-outline',
      name: L('Camp & family recreation', 'Campamento y recreación familiar', 'Trại hè & giải trí gia đình'),
      tagline: L(
        'Adaptive camps, Special Olympics, inclusive events for the whole family.',
        'Campamentos adaptados, Olimpiadas Especiales, eventos inclusivos para toda la familia.',
        'Trại hè thích ứng, Thế vận hội Đặc biệt, sự kiện hòa nhập cho cả gia đình.'
      ),
      whatItIs: L(
        'Summer and adaptive camps, adaptive sports and Special Olympics, and family recreational activities that build community integration for the whole family.',
        'Campamentos de verano y adaptados, deportes adaptados y Olimpiadas Especiales, y actividades recreativas familiares que fomentan la integración comunitaria de toda la familia.',
        'Trại hè và trại thích ứng, thể thao thích ứng và Thế vận hội Đặc biệt, và các hoạt động giải trí gia đình xây dựng sự hòa nhập cộng đồng cho cả gia đình.'
      ),
      theCatch: L(
        'It’s not automatic. It has to tie to a need in the IPP — usually community integration — so ask your coordinator about community integration services, and get it written in.',
        'No es automático. Tiene que ligarse a una necesidad en el IPP — normalmente la integración comunitaria — así que pregunte a su coordinador por servicios de integración comunitaria y logre que quede escrito.',
        'Nó không tự động. Nó phải gắn với một nhu cầu trong IPP — thường là sự hòa nhập cộng đồng — nên hãy hỏi điều phối viên về dịch vụ hòa nhập cộng đồng và đưa nó vào kế hoạch.'
      ),
      howToAsk: [
        L(
          'Name the need: chances to build social skills and community connection.',
          'Nombre la necesidad: oportunidades de desarrollar habilidades sociales y conexión comunitaria.',
          'Nêu nhu cầu: cơ hội xây dựng kỹ năng xã hội và kết nối cộng đồng.'
        ),
        L(
          'Ask to have community integration noted as a need in the IPP.',
          'Pida que la integración comunitaria se anote como necesidad en el IPP.',
          'Đề nghị ghi nhận sự hòa nhập cộng đồng là nhu cầu trong IPP.'
        ),
        L(
          'Request a camp or recreation program to meet it, by name.',
          'Solicite un campamento o programa recreativo para atenderla, por su nombre.',
          'Yêu cầu một trại hè hoặc chương trình giải trí để đáp ứng, theo tên.'
        ),
      ],
      script: L(
        'I’d like to look at community integration in {child}’s IPP — a summer camp or an adaptive program would really help their social skills. Could we note that as a need and explore what’s available?',
        'Me gustaría considerar la integración comunitaria en el IPP de {child} — un campamento de verano o un programa adaptado ayudaría mucho a sus habilidades sociales. ¿Podríamos anotarlo como necesidad y explorar qué hay disponible?',
        'Tôi muốn xem xét sự hòa nhập cộng đồng trong IPP của {child} — một trại hè hoặc chương trình thích ứng sẽ giúp ích nhiều cho kỹ năng xã hội của bé. Chúng ta có thể ghi nhận đó là nhu cầu và tìm hiểu những gì có sẵn không?'
      ),
      ippNeedHook: L(
        'Community integration and social-skill development is a need the child’s plan should address.',
        'La integración comunitaria y el desarrollo de habilidades sociales es una necesidad que el plan del niño debe atender.',
        'Sự hòa nhập cộng đồng và phát triển kỹ năng xã hội là nhu cầu kế hoạch của trẻ nên giải quyết.'
      ),
      citation: RC_CITE,
      terms: [
        'camp', 'recreation', 'sports', 'special olympics', 'summer', 'family activities',
        'campamento', 'recreación', 'deportes', 'verano', 'trại hè', 'giải trí', 'thể thao',
      ],
    },
    {
      key: 'parent_training',
      icon: 'school-outline',
      name: L('Parent training', 'Capacitación para padres', 'Huấn luyện cha mẹ'),
      tagline: L(
        'Training on behavior, communication and supporting the sibling relationship.',
        'Capacitación sobre conducta, comunicación y cómo apoyar la relación entre hermanos.',
        'Huấn luyện về hành vi, giao tiếp và hỗ trợ mối quan hệ anh chị em.'
      ),
      whatItIs: L(
        'Training for you — on behavior management, communication and AAC, home programs, and supporting sibling relationships. Underused, and a real alternative to waiting on a service waitlist.',
        'Capacitación para usted — sobre manejo de conducta, comunicación y CAA, programas en casa, y cómo apoyar las relaciones entre hermanos. Poco usada, y una alternativa real a esperar en una lista de servicios.',
        'Huấn luyện cho quý vị — về quản lý hành vi, giao tiếp và AAC, chương trình tại nhà, và hỗ trợ mối quan hệ anh chị em. Ít được sử dụng, và là một lựa chọn thật sự thay cho việc chờ danh sách dịch vụ.'
      ),
      theCatch: L(
        'It’s not automatic, even though it’s often quicker than a waitlist. It has to tie to a need in the IPP — building your own capacity to support your child — so ask for it by name.',
        'No es automática, aunque suele ser más rápida que una lista de espera. Tiene que ligarse a una necesidad en el IPP — desarrollar su propia capacidad para apoyar a su hijo — así que pídala por su nombre.',
        'Nó không tự động, dù thường nhanh hơn danh sách chờ. Nó phải gắn với một nhu cầu trong IPP — xây dựng năng lực của chính quý vị để hỗ trợ con — nên hãy yêu cầu theo tên.'
      ),
      howToAsk: [
        L(
          'Name the need: a skill you want to build to support your child at home.',
          'Nombre la necesidad: una habilidad que quiere desarrollar para apoyar a su hijo en casa.',
          'Nêu nhu cầu: một kỹ năng quý vị muốn xây dựng để hỗ trợ con tại nhà.'
        ),
        L(
          'Ask to have parent capacity-building noted as a need in the IPP.',
          'Pida que el desarrollo de la capacidad de los padres se anote como necesidad en el IPP.',
          'Đề nghị ghi nhận việc xây dựng năng lực cha mẹ là nhu cầu trong IPP.'
        ),
        L(
          'Request parent training to meet it, by name.',
          'Solicite capacitación para padres para atenderla, por su nombre.',
          'Yêu cầu huấn luyện cha mẹ để đáp ứng, theo tên.'
        ),
      ],
      script: L(
        'I’d like to add parent training to {child}’s IPP — learning behavior strategies I can use at home would help all of us. Could we note that as a need?',
        'Me gustaría agregar capacitación para padres al IPP de {child} — aprender estrategias de conducta que pueda usar en casa nos ayudaría a todos. ¿Podríamos anotarlo como necesidad?',
        'Tôi muốn thêm huấn luyện cha mẹ vào IPP của {child} — học các chiến lược hành vi tôi có thể dùng ở nhà sẽ giúp tất cả chúng tôi. Chúng ta có thể ghi nhận đó là nhu cầu không?'
      ),
      ippNeedHook: L(
        'Building the parent’s capacity to support the child at home is a need the plan should address.',
        'Desarrollar la capacidad de los padres para apoyar al niño en casa es una necesidad que el plan debe atender.',
        'Xây dựng năng lực của cha mẹ để hỗ trợ trẻ tại nhà là nhu cầu kế hoạch nên giải quyết.'
      ),
      citation: RC_CITE,
      terms: [
        'parent training', 'training', 'behavior', 'aac', 'home program',
        'capacitación', 'padres', 'conducta', 'huấn luyện', 'cha mẹ', 'hành vi',
      ],
    },
  ];
}

/** Look up one support by key, localized. Returns null for an unknown key. */
export function getFamilySupport(
  key: string,
  locale: FunnelLocale = 'en'
): FamilySupport | null {
  return getFamilySupports(locale).find((s) => s.key === key) ?? null;
}

/**
 * The neutral stand-in for a child's name, per locale — so a missing name never
 * drops an English word into Spanish or Vietnamese copy.
 */
const CHILD_FALLBACK: Record<FunnelLocale, string> = {
  en: 'your child',
  es: 'su hijo/a',
  vi: 'con quý vị',
};

/**
 * Fill a script's {child} placeholder with the child's name (or the locale's
 * neutral fallback), so the sample ask reads as the parent's own. The locale is
 * passed in — the caller already has it — rather than sniffed from the copy.
 */
export function fillScript(
  script: string,
  childName: string | null | undefined,
  locale: FunnelLocale = 'en'
): string {
  const name = (childName && childName.trim()) || CHILD_FALLBACK[locale];
  return script.replace(/\{child\}/g, name);
}

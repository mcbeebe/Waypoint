/**
 * Home tools catalog (Home Tools Redesign, hybrid v2 — Aug 2026).
 * One source of truth for every destination the Home tools area offers:
 * the three always-open action rows, the four doors that expand in place,
 * and the searchable long tail. Copy decisions come from the 10-persona
 * caregiver stress test: plain, translatable labels (no idioms as names —
 * "Paper Trail" survives only as English flavor in a description), badges
 * that carry dates and direction, the "they said no" moment claimed
 * explicitly, and a Money door that speaks needs, not payers.
 *
 * Pure data + derivation, trilingual, no react-native imports.
 */
import type { FunnelLocale } from '@/lib/eligibility';
import type { FamilyRequest } from '@/hooks/useRequests';
import { deadlineFor } from '@/lib/requestClocks';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

/** A navigable destination. `params` stays serializable. */
export interface ToolRoute {
  screen: string;
  params?: Record<string, string>;
  /** Tab stack the screen lives in when it's not on the Home stack. */
  tab?: 'Navigator' | 'Calendar';
}

export interface ToolEntry {
  key: string;
  label: string;
  description: string;
  /** Ionicons name rendered by the UI. */
  icon: string;
  route: ToolRoute;
  /** Extra plain-language words search should match (both English and localized). */
  searchTerms: string[];
}

export type DoorKey = 'understand' | 'money' | 'records' | 'more';

export interface ToolDoor {
  key: DoorKey;
  /** Title; `records` gets the child's name prefixed by the UI. */
  title: string;
  /** One-line contents preview shown collapsed. */
  contents: string;
  icon: string;
  /** Icon chip tint (bg) and stroke color. */
  tint: string;
  color: string;
  tools: ToolEntry[];
}

/** The three always-open action rows. */
export function getActionTools(locale: FunnelLocale = 'en'): ToolEntry[] {
  const L = picker(locale);
  return [
    {
      key: 'letters',
      label: L('Letters', 'Cartas', 'Thư từ'),
      description: L(
        'Ask in writing — we write it with you. Said no on the phone? Start here.',
        'Pida por escrito — la escribimos con usted. ¿Le dijeron que no por teléfono? Empiece aquí.',
        'Đề nghị bằng văn bản — chúng tôi soạn cùng quý vị. Bị từ chối qua điện thoại? Bắt đầu ở đây.'
      ),
      icon: 'mail-outline',
      route: { screen: 'Letters' },
      searchTerms: ['they said no', 'denied', 'refuse', 'letter', 'request', 'appeal', 'no', 'carta', 'me dijeron que no', 'thư', 'từ chối'],
    },
    {
      key: 'requests',
      label: L('Requests & Deadlines', 'Solicitudes y plazos', 'Yêu cầu & thời hạn'),
      description: L(
        'Every ask, tracked against its legal deadline',
        'Cada solicitud, seguida contra su plazo legal',
        'Mỗi yêu cầu được theo dõi theo thời hạn pháp lý'
      ),
      icon: 'stopwatch-outline',
      route: { screen: 'RequestTracker' },
      searchTerms: ['deadline', 'clock', 'waiting', 'no answer', 'overdue', 'tracker', 'plazo', 'esperando', 'thời hạn', 'chờ'],
    },
    {
      key: 'sent_received',
      label: L('Sent & Received', 'Enviado y recibido', 'Đã gửi & đã nhận'),
      description: L(
        'Every email and reply, dated — your receipts (your paper trail)',
        'Cada correo y respuesta, con fecha — sus comprobantes',
        'Mỗi email và thư trả lời, có ngày — bằng chứng của quý vị'
      ),
      icon: 'file-tray-full-outline',
      route: { screen: 'CommunicationLog' },
      searchTerms: ['paper trail', 'email', 'reply', 'sent', 'record', 'proof', 'receipts', 'correo', 'respuesta', 'email đã gửi'],
    },
  ];
}

/** The four doors, in display order. */
export function getToolDoors(locale: FunnelLocale = 'en'): ToolDoor[] {
  const L = picker(locale);
  return [
    {
      key: 'understand',
      title: L('Understand the system', 'Entender el sistema', 'Hiểu hệ thống'),
      contents: L(
        'Regional Center · School (IEP) · Transition & 18',
        'Centro Regional · Escuela (IEP) · Transición y 18',
        'Trung tâm Khu vực · Trường học (IEP) · Chuyển tiếp & 18 tuổi'
      ),
      icon: 'compass-outline',
      tint: '#EDF0F7',
      color: '#1B2A4A',
      // The "how the system works" guides (ProcessMap) live in the Learn tab
      // now — removed here so a guide has one home (owner, Aug 30 2026).
      tools: [
        {
          key: 'eligibility',
          label: L('What your child likely qualifies for', 'Para qué probablemente califica su hijo/a', 'Con quý vị có thể đủ điều kiện gì'),
          description: L('Your eligibility result, with sources', 'Su resultado de elegibilidad, con fuentes', 'Kết quả điều kiện của quý vị, kèm nguồn'),
          icon: 'checkmark-circle-outline',
          route: { screen: 'EligibilityResult' },
          searchTerms: ['qualify', 'eligible', 'result', 'califica', 'đủ điều kiện'],
        },
        {
          key: 'agencies',
          label: L('Agencies & contacts', 'Agencias y contactos', 'Cơ quan & liên hệ'),
          description: L('Who does what — and how to reach them', 'Quién hace qué — y cómo contactarlos', 'Ai làm gì — và cách liên hệ'),
          icon: 'business-outline',
          route: { screen: 'Agencies' },
          searchTerms: ['agency', 'contact', 'phone', 'who', 'agencia', 'cơ quan'],
        },
      ],
    },
    {
      key: 'money',
      title: L('Money & benefits', 'Dinero y beneficios', 'Tiền & trợ cấp'),
      contents: L(
        'Diapers & equipment · Respite money · Medi-Cal & IHSS',
        'Pañales y equipo · Dinero para relevo · Medi-Cal e IHSS',
        'Tã & thiết bị · Tiền chăm sóc thay thế · Medi-Cal & IHSS'
      ),
      icon: 'wallet-outline',
      tint: '#E6F7F1',
      color: '#0E9F6E',
      tools: [
        {
          key: 'rc_funding',
          label: L('What the Regional Center can fund', 'Lo que el Centro Regional puede pagar', 'Trung tâm Khu vực có thể chi trả gì'),
          description: L('Diapers, equipment, respite, camps — money most families miss', 'Pañales, equipo, relevo, campamentos — dinero que muchas familias pierden', 'Tã, thiết bị, chăm sóc thay thế, trại hè — khoản tiền nhiều gia đình bỏ lỡ'),
          icon: 'wallet-outline',
          route: { screen: 'Reimbursables' },
          searchTerms: ['diapers', 'stroller', 'equipment', 'respite', 'camp', 'gear', 'reimburse', 'funding', 'pañales', 'equipo', 'tã', 'xe đẩy'],
        },
        // The benefits-stack guide (ResourceStack) lives in the Learn tab now
        // ("Money and benefits, layer by layer") — one home for a guide.
        {
          key: 'insurance',
          label: L('Insurance', 'Seguro médico', 'Bảo hiểm'),
          description: L('Authorizations and appeals', 'Autorizaciones y apelaciones', 'Ủy quyền và kháng cáo'),
          icon: 'shield-checkmark-outline',
          route: { screen: 'Insurance' },
          searchTerms: ['insurance', 'authorization', 'denial', 'seguro', 'bảo hiểm'],
        },
        {
          key: 'expenses',
          label: L('Expenses & tax report', 'Gastos e informe de impuestos', 'Chi phí & báo cáo thuế'),
          description: L('Track spending; the yearly medical-deduction report', 'Registre gastos; el informe anual de deducciones médicas', 'Ghi chi tiêu; báo cáo khấu trừ y tế hằng năm'),
          icon: 'receipt-outline',
          route: { screen: 'Expenses' },
          searchTerms: ['expense', 'tax', 'spending', 'gastos', 'chi phí'],
        },
      ],
    },
    {
      key: 'records',
      // The UI prefixes the child's name ("Teddy's records"); this is the fallback.
      title: L('Records', 'Expedientes', 'Hồ sơ'),
      contents: L(
        'Documents · IEP · Health · Care team',
        'Documentos · IEP · Salud · Equipo de cuidado',
        'Tài liệu · IEP · Sức khỏe · Nhóm chăm sóc'
      ),
      icon: 'folder-open-outline',
      tint: '#FFF1E7',
      color: '#F97316',
      tools: [
        {
          key: 'documents',
          label: L('Documents', 'Documentos', 'Tài liệu'),
          description: L('The IPP, the IEP, assessments — analyzed for you', 'El IPP, el IEP, evaluaciones — analizados para usted', 'IPP, IEP, các đánh giá — được phân tích cho quý vị'),
          icon: 'folder-open-outline',
          route: { screen: 'Documents' },
          searchTerms: ['document', 'upload', 'ipp', 'file', 'documento', 'tài liệu'],
        },
        {
          key: 'iep_hub',
          label: L('IEP goals & timeline', 'Metas y calendario del IEP', 'Mục tiêu & lịch trình IEP'),
          description: L('Goals, minutes, and the meetings ahead', 'Metas, minutos y las próximas reuniones', 'Mục tiêu, số phút và các cuộc họp sắp tới'),
          icon: 'school-outline',
          route: { screen: 'IEPHub' },
          searchTerms: ['iep', 'goals', 'meeting', 'metas', 'mục tiêu'],
        },
        {
          key: 'health',
          label: L('Health records', 'Registros de salud', 'Hồ sơ sức khỏe'),
          description: L('Diagnoses, medications, visits', 'Diagnósticos, medicamentos, visitas', 'Chẩn đoán, thuốc, lần khám'),
          icon: 'fitness-outline',
          route: { screen: 'HealthRecords' },
          searchTerms: ['health', 'medical', 'diagnosis', 'salud', 'sức khỏe'],
        },
        {
          key: 'care_team',
          label: L('Care team & services', 'Equipo de cuidado y servicios', 'Nhóm chăm sóc & dịch vụ'),
          description: L('Providers and the services they deliver', 'Proveedores y los servicios que brindan', 'Nhà cung cấp và dịch vụ họ thực hiện'),
          icon: 'medkit-outline',
          route: { screen: 'Providers' },
          searchTerms: ['provider', 'therapist', 'service', 'proveedor', 'nhà cung cấp'],
        },
      ],
    },
    {
      key: 'more',
      title: L('Everything else', 'Todo lo demás', 'Mọi thứ khác'),
      contents: L(
        'Resources · Blog · Family · Insights · more',
        'Recursos · Blog · Familia · Estadísticas · más',
        'Tài nguyên · Blog · Gia đình · Thống kê · thêm'
      ),
      icon: 'apps-outline',
      tint: '#EFF6FF',
      color: '#2563EB',
      tools: [
        {
          key: 'resources',
          label: L('Resource library', 'Biblioteca de recursos', 'Thư viện tài nguyên'),
          description: L('Guides and knowledge base', 'Guías y base de conocimientos', 'Hướng dẫn và kho kiến thức'),
          icon: 'book-outline',
          route: { screen: 'Resources', tab: 'Navigator' },
          searchTerms: ['resource', 'guide', 'recursos', 'tài nguyên'],
        },
        {
          key: 'email_check',
          label: L('Email analyzer', 'Analizador de correos', 'Phân tích email'),
          description: L("Paste any agency email — we'll read between the lines", 'Pegue cualquier correo de una agencia — leemos entre líneas', 'Dán email từ cơ quan — chúng tôi đọc giữa các dòng'),
          icon: 'search-outline',
          route: { screen: 'EmailAnalyzer' },
          searchTerms: ['analyze', 'email', 'analizar', 'phân tích'],
        },
        {
          key: 'services',
          label: L('Services', 'Servicios', 'Dịch vụ'),
          description: L('Hours authorized vs delivered', 'Horas autorizadas vs. entregadas', 'Giờ được duyệt so với thực nhận'),
          icon: 'layers-outline',
          route: { screen: 'Services' },
          searchTerms: ['services', 'hours', 'servicios', 'dịch vụ'],
        },
        {
          key: 'insights',
          label: L('Insights', 'Estadísticas', 'Thống kê'),
          description: L('Patterns across your requests and spending', 'Patrones en sus solicitudes y gastos', 'Xu hướng trong yêu cầu và chi tiêu'),
          icon: 'bar-chart-outline',
          route: { screen: 'Insights' },
          searchTerms: ['insights', 'stats', 'estadísticas', 'thống kê'],
        },
        {
          key: 'family',
          label: L('Family sharing', 'Compartir en familia', 'Chia sẻ gia đình'),
          description: L('Give a co-parent or advocate access', 'Dé acceso a un co-padre o defensor', 'Cấp quyền cho đồng phụ huynh hoặc người bênh vực'),
          icon: 'people-outline',
          route: { screen: 'FamilySharing' },
          searchTerms: ['family', 'share', 'access', 'familia', 'gia đình'],
        },
        {
          key: 'blog',
          label: L('Blog', 'Blog', 'Blog'),
          description: L('News and stories', 'Noticias e historias', 'Tin tức và câu chuyện'),
          icon: 'newspaper-outline',
          route: { screen: 'Blog', tab: 'Navigator' },
          searchTerms: ['blog', 'news', 'noticias', 'tin tức'],
        },
        {
          key: 'premium',
          label: L('Premium', 'Premium', 'Premium'),
          description: L('What free includes, what Premium adds', 'Qué incluye gratis y qué agrega Premium', 'Miễn phí gồm gì, Premium thêm gì'),
          icon: 'star-outline',
          route: { screen: 'Pricing' },
          searchTerms: ['premium', 'price', 'upgrade', 'precio', 'giá'],
        },
        {
          key: 'provider_portal',
          label: L('Provider portal', 'Portal de proveedores', 'Cổng nhà cung cấp'),
          description: L('For professionals working with your family', 'Para profesionales que trabajan con su familia', 'Cho chuyên viên làm việc với gia đình quý vị'),
          icon: 'briefcase-outline',
          route: { screen: 'ProviderPortal' },
          searchTerms: ['provider portal', 'professional', 'portal'],
        },
      ],
    },
  ];
}

/** Every entry, flat — actions first, then doors in order. */
export function getAllTools(locale: FunnelLocale = 'en'): ToolEntry[] {
  return [
    ...getActionTools(locale),
    ...getToolDoors(locale).flatMap((d) => d.tools),
  ];
}

/**
 * Plain-word search over labels, descriptions, and search terms.
 * Case- and accent-insensitive; every whitespace-separated term must match.
 */
export function searchTools(query: string, locale: FunnelLocale = 'en'): ToolEntry[] {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return getAllTools(locale).filter((t) => {
    const hay = norm([t.label, t.description, ...t.searchTerms].join(' '));
    return terms.every((term) => hay.includes(term));
  });
}

/**
 * Age-aware search placeholder (stress test: "the examples are a jargon
 * quiz" — use the words a parent at this stage actually holds).
 */
export function searchPlaceholder(
  ageYears: number | null | undefined,
  locale: FunnelLocale = 'en'
): string {
  const L = picker(locale);
  if (ageYears != null && ageYears < 3) {
    return L(
      'Find anything — try "Early Start", "diapers", "they said no"',
      'Buscar — pruebe "Early Start", "pañales", "me dijeron que no"',
      'Tìm kiếm — thử "Early Start", "tã", "họ từ chối"'
    );
  }
  if (ageYears != null && ageYears >= 13) {
    return L(
      'Find anything — try "transition", "IEP", "they said no"',
      'Buscar — pruebe "transición", "IEP", "me dijeron que no"',
      'Tìm kiếm — thử "chuyển tiếp", "IEP", "họ từ chối"'
    );
  }
  return L(
    'Find anything — try "diapers", "IEP", "they said no"',
    'Buscar — pruebe "pañales", "IEP", "me dijeron que no"',
    'Tìm kiếm — thử "tã", "IEP", "họ từ chối"'
  );
}

// ─── Badges: dates and direction, never bare counts ─────────────────────────

export interface ToolBadge {
  text: string;
  /** 'warning' = amber (due soon / waiting), 'danger' = red (overdue), 'info' = blue. */
  tone: 'warning' | 'danger' | 'info';
}

const OPEN_STATUSES = new Set(['requested', 'in_progress']);

/**
 * The Requests & Deadlines badge from live requests. Worst state wins:
 * an overdue clock beats a due date beats a waiting count. Null when
 * nothing is open (stress test: no demo data, no bare zero).
 */
export function requestsBadge(
  requests: Pick<FamilyRequest, 'status' | 'request_type' | 'requested_on'>[],
  locale: FunnelLocale = 'en',
  now = new Date()
): ToolBadge | null {
  const L = picker(locale);
  const open = requests.filter((r) => OPEN_STATUSES.has(r.status));
  if (open.length === 0) return null;
  const deadlines = open
    .map((r) => deadlineFor(r.request_type, r.requested_on, now))
    .filter((d): d is NonNullable<typeof d> => d != null)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
  const worst = deadlines[0];
  if (worst && worst.overdue) {
    const n = deadlines.filter((d) => d.overdue).length;
    return {
      text: n === 1 ? L('1 overdue', '1 vencida', '1 quá hạn') : L(`${n} overdue`, `${n} vencidas`, `${n} quá hạn`),
      tone: 'danger',
    };
  }
  if (worst && worst.daysRemaining <= 7) {
    const day = new Date(`${worst.dueOn}T00:00:00`);
    const dayName = day.toLocaleDateString(
      locale === 'es' ? 'es-US' : locale === 'vi' ? 'vi-VN' : 'en-US',
      { weekday: 'short' }
    );
    return { text: L(`due ${dayName}`, `vence ${dayName}`, `hạn ${dayName}`), tone: 'warning' };
  }
  return {
    text:
      open.length === 1
        ? L('1 waiting', '1 en espera', '1 đang chờ')
        : L(`${open.length} waiting`, `${open.length} en espera`, `${open.length} đang chờ`),
    tone: 'warning',
  };
}

/** The Sent & Received badge: a new, unanswered reply. */
export function replyBadge(
  hasUnansweredReply: boolean,
  locale: FunnelLocale = 'en'
): ToolBadge | null {
  const L = picker(locale);
  if (!hasUnansweredReply) return null;
  return { text: L('1 new reply', '1 respuesta nueva', '1 trả lời mới'), tone: 'info' };
}

/**
 * Zero-request starter copy for the Letters row (stress test: newcomers
 * found no "start here"; the action card should teach the first move).
 */
export function lettersDescription(
  hasAnyRequest: boolean,
  locale: FunnelLocale = 'en'
): string {
  const L = picker(locale);
  if (!hasAnyRequest) {
    return L(
      'Start your first request — asking in writing is what makes deadlines real. We write it with you.',
      'Empiece su primera solicitud — pedir por escrito hace reales los plazos. La escribimos con usted.',
      'Bắt đầu yêu cầu đầu tiên — đề nghị bằng văn bản làm thời hạn có hiệu lực. Chúng tôi soạn cùng quý vị.'
    );
  }
  return getActionTools(locale)[0].description;
}

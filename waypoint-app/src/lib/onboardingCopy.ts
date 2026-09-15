/**
 * Every user-visible string in the six-step onboarding flow (initiative 009,
 * PR 4) — the last piece of Gate 7, "a Spanish-speaking parent uses the full
 * app".
 *
 * WHY THIS ONE CLOSES A GAP THE OTHER PRs OPENED. Device detection made the
 * app open in the family's language, and the Welcome PR made the first screen
 * speak it. Without this, a Spanish-speaking parent read a Spanish Welcome,
 * tapped "Registrarse con correo", and landed in an English six-step form on
 * the very next screen — a worse impression than an app that had been English
 * throughout, because it reads as a translation that gave up.
 *
 * VALUES ARE NOT TRANSLATABLE. The `value` on every option here is persisted:
 * `children.rc_status`, `children.iep_status`, `families.insurance_carrier`.
 * They are read by `planGenerator`, `gapRules`, `homeTriage`, `actionReconcile`
 * and `HomeScreen`. A translated value writes a row the rest of the app cannot
 * read — silently, and only for the families this work is meant to serve.
 * Only labels and descriptions move between languages; `onboardingCopy.test.ts`
 * pins that split, and the values match `profileCopy.ts`'s grids exactly
 * because the two screens edit the same columns.
 *
 * REGISTER, matched to the corpus: Spanish is **usted**, the child is
 * **"su hijo/a"**; Vietnamese uses **"quý vị"** and **"con quý vị"**.
 *
 * These are careful drafts pending native-speaker review, per the house rule
 * in `eligibility.ts`.
 */
import type { FunnelLocale } from '@/lib/eligibility';

function pick(locale: FunnelLocale, en: string, es: string, vi: string): string {
  return locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export interface OnboardingOption {
  value: string;
  label: string;
  emoji: string;
  description?: string;
}

/** Step 3 — Regional Center status. Values persist to `children.rc_status`. */
export function rcStatusOptions(locale: FunnelLocale = 'en'): OnboardingOption[] {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return [
    {
      value: 'unknown',
      label: L("I don't know", 'No sé', 'Tôi không biết'),
      emoji: '❓',
      description: L(
        'Not sure what Regional Center is',
        'No sé qué es un Centro Regional',
        'Chưa rõ Trung tâm Khu vực là gì',
      ),
    },
    {
      value: 'known',
      label: L('I know my RC', 'Sé cuál es mi CR', 'Tôi biết TTKV của mình'),
      emoji: '📍',
      description: L(
        'Know which one but not connected',
        'Sé cuál me corresponde, pero no tengo servicios',
        'Biết là trung tâm nào nhưng chưa liên hệ',
      ),
    },
    {
      value: 'applied',
      label: L('Applied / In process', 'Solicitado / En trámite', 'Đã nộp đơn / Đang xử lý'),
      emoji: '📝',
      description: L(
        'Referral or intake started',
        'Ya se inició la referencia o la entrevista inicial',
        'Đã bắt đầu giới thiệu hoặc tiếp nhận',
      ),
    },
    {
      value: 'active',
      label: L('Active client', 'Cliente activo', 'Đang nhận dịch vụ'),
      emoji: '✅',
      description: L(
        'Currently receiving RC services',
        'Ya recibe servicios del Centro Regional',
        'Hiện đang nhận dịch vụ của TTKV',
      ),
    },
  ];
}

/** Step 4 — IEP status. Values persist to `children.iep_status`. */
export function iepStatusOptions(locale: FunnelLocale = 'en'): OnboardingOption[] {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return [
    {
      value: 'no',
      label: L('No IEP', 'Sin IEP', 'Không có IEP'),
      emoji: '📭',
      description: L('Never requested', 'Nunca lo hemos solicitado', 'Chưa từng yêu cầu'),
    },
    {
      value: 'unknown',
      label: L("Don't know", 'No sé', 'Không biết'),
      emoji: '❓',
      description: L(
        'Not sure if child has one',
        'No sé si mi hijo/a tiene uno',
        'Chưa rõ con có hay không',
      ),
    },
    {
      value: 'eval_done',
      label: L('Evaluation done', 'Evaluación hecha', 'Đã đánh giá xong'),
      emoji: '🔍',
      description: L(
        'Assessed but no IEP yet',
        'Ya lo evaluaron, pero aún no hay IEP',
        'Đã đánh giá nhưng chưa có IEP',
      ),
    },
    {
      value: 'active',
      label: L('Active IEP', 'IEP activo', 'IEP đang hiệu lực'),
      emoji: '✅',
      description: L(
        'Currently has IEP in place',
        'Ya tiene un IEP vigente',
        'Hiện đang có IEP',
      ),
    },
    {
      value: 'na',
      label: L('Not applicable', 'No aplica', 'Không áp dụng'),
      emoji: '➖',
      description: L(
        'Child not school age',
        'Mi hijo/a aún no tiene edad escolar',
        'Con chưa đến tuổi đi học',
      ),
    },
  ];
}

/** Step 5 — insurance. Values persist to `families.insurance_carrier`. */
export function insuranceOptions(locale: FunnelLocale = 'en'): OnboardingOption[] {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return [
    { value: 'private', label: L('Private insurance', 'Seguro privado', 'Bảo hiểm tư nhân'), emoji: '🏥' },
    // Medi-Cal is a proper noun — the programme is called that in every language.
    { value: 'medicaid', label: 'Medi-Cal', emoji: '🏛️' },
    { value: 'both', label: L('Both', 'Ambos', 'Cả hai'), emoji: '🔄' },
    { value: 'none', label: L('None / Unsure', 'Ninguno / No sé', 'Không có / Không chắc'), emoji: '❓' },
  ];
}

export interface OnboardingCopy {
  // Step 0
  welcomeTitle: string;
  welcomeSubtitle: string;
  parentFirstName: string;
  parentFirstNameExample: string;
  childFirstName: string;
  childFirstNameExample: string;
  zipCode: string;
  zipExample: string;
  findByCounty: string;
  findByCountyA11y: string;
  emailOptional: string;
  emailHint: string;

  // Steps 1–5
  diagnosisTitle: string;
  birthdayTitle: string;
  birthdaySubtitle: string;
  birthdayA11y: string;
  tapToSelectBirthday: string;
  rcStatusTitle: string;
  rcStatusSubtitle: string;
  iepStatusTitle: string;
  iepStatusSubtitle: string;
  insuranceTitle: string;
  insuranceSubtitle: string;

  // County sheet
  chooseCounty: string;
  cancel: string;

  // Footer
  back: string;
  backA11y: string;
  next: string;
  letsGo: string;

  // Failures
  setupFailedTitle: string;
  setupFailedBody: string;
}

/** Fixed strings for the onboarding flow, for one locale. */
export function onboardingCopy(locale: FunnelLocale = 'en'): OnboardingCopy {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return {
    welcomeTitle: L('Welcome to Waypoint', 'Bienvenido a Waypoint', 'Chào mừng đến với Waypoint'),
    welcomeSubtitle: L(
      "Let's get to know your family",
      'Queremos conocer a su familia',
      'Chúng tôi muốn hiểu về gia đình quý vị',
    ),
    parentFirstName: L('Your first name', 'Su nombre', 'Tên của quý vị'),
    parentFirstNameExample: L('e.g., Sarah', 'p. ej., Sara', 'ví dụ: Lan'),
    childFirstName: L("Child's first name", 'Nombre de su hijo/a', 'Tên con quý vị'),
    childFirstNameExample: L('e.g., Maya', 'p. ej., Maya', 'ví dụ: Minh'),
    zipCode: L('ZIP code', 'Código postal', 'Mã bưu điện'),
    zipExample: L('e.g., 94610', 'p. ej., 94610', 'ví dụ: 94610'),
    findByCounty: L(
      "Don't know your ZIP? Find by county →",
      '¿No sabe su código postal? Búsquelo por condado →',
      'Không biết mã bưu điện? Tìm theo quận →',
    ),
    findByCountyA11y: L(
      'Find your Regional Center by county instead',
      'Buscar su Centro Regional por condado',
      'Tìm Trung tâm Khu vực theo quận',
    ),
    emailOptional: L('Email (optional)', 'Correo electrónico (opcional)', 'Email (không bắt buộc)'),
    emailHint: L(
      'For deadline reminders',
      'Para recordatorios de fechas límite',
      'Để nhắc hạn chót',
    ),

    diagnosisTitle: L("Child's Diagnosis", 'Diagnóstico de su hijo/a', 'Chẩn đoán của con quý vị'),
    birthdayTitle: L("Child's Birthday", 'Fecha de nacimiento', 'Ngày sinh của con'),
    birthdaySubtitle: L(
      'This helps us give age-appropriate guidance',
      'Esto nos ayuda a dar orientación adecuada para su edad',
      'Điều này giúp chúng tôi đưa ra hướng dẫn phù hợp với độ tuổi',
    ),
    birthdayA11y: L("Child's birthday", 'Fecha de nacimiento de su hijo/a', 'Ngày sinh của con quý vị'),
    tapToSelectBirthday: L(
      'Tap to select birthday',
      'Toque para elegir la fecha de nacimiento',
      'Chạm để chọn ngày sinh',
    ),
    rcStatusTitle: L('Regional Center Status', 'Estado con el Centro Regional', 'Tình trạng với Trung tâm Khu vực'),
    rcStatusSubtitle: L(
      'Regional Centers provide services under the Lanterman Act',
      'Los Centros Regionales brindan servicios bajo la Ley Lanterman',
      'Các Trung tâm Khu vực cung cấp dịch vụ theo Đạo luật Lanterman',
    ),
    iepStatusTitle: L('IEP Status', 'Estado del IEP', 'Tình trạng IEP'),
    iepStatusSubtitle: L(
      'Individualized Education Program at school',
      'Programa de Educación Individualizado en la escuela',
      'Chương trình Giáo dục Cá nhân hóa ở trường',
    ),
    insuranceTitle: L('Insurance Type', 'Tipo de seguro', 'Loại bảo hiểm'),
    insuranceSubtitle: L(
      'This determines which benefits and services apply',
      'Esto determina qué beneficios y servicios le corresponden',
      'Điều này quyết định những trợ cấp và dịch vụ nào áp dụng',
    ),

    chooseCounty: L('Choose your county', 'Elija su condado', 'Chọn quận của quý vị'),
    cancel: L('Cancel', 'Cancelar', 'Hủy'),

    back: L('Back', 'Atrás', 'Quay lại'),
    backA11y: L('Go back', 'Volver atrás', 'Quay lại'),
    next: L('Next', 'Siguiente', 'Tiếp theo'),
    // The reward at the end of six steps — it should sound like one, not like
    // a form submit button.
    letsGo: L("Let's go!", '¡Vamos!', 'Bắt đầu thôi!'),

    setupFailedTitle: L(
      'Could not finish setup',
      'No se pudo terminar la configuración',
      'Không hoàn tất được thiết lập',
    ),
    setupFailedBody: L(
      'Failed to save. Please try again.',
      'No se pudo guardar. Inténtelo de nuevo.',
      'Không lưu được. Vui lòng thử lại.',
    ),
  };
}

// ─── Interpolated ────────────────────────────────────────────────────────────

/**
 * "County: Alameda ✓ (tap to change)" once a county has been picked.
 *
 * Phrased around the name rather than after it, because Spanish and Vietnamese
 * both want the label attached differently from English.
 */
export function countyChosen(county: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `County: ${county} ✓ (tap to change)`,
    `Condado: ${county} ✓ (toque para cambiar)`,
    `Quận: ${county} ✓ (chạm để thay đổi)`,
  );
}

/**
 * The child's age, as the badge under the birthday picker shows it.
 *
 * Built per language rather than by appending an "s": Spanish inflects both
 * nouns independently ("1 año, 2 meses"), and Vietnamese has no grammatical
 * plural at all — the numeral carries it. An English-shaped template would
 * read "1 años" or "2 tháng**s**" for a family reading their child's age back.
 */
export function ageDisplay(years: number, months: number, locale: FunnelLocale = 'en'): string {
  const y = Math.max(0, Math.floor(years));
  const m = Math.max(0, Math.floor(months));
  if (locale === 'es') {
    const yearPart = `${y} ${y === 1 ? 'año' : 'años'}`;
    const monthPart = `${m} ${m === 1 ? 'mes' : 'meses'}`;
    return y > 0 ? `${yearPart}, ${monthPart}` : monthPart;
  }
  if (locale === 'vi') {
    return y > 0 ? `${y} tuổi, ${m} tháng` : `${m} tháng`;
  }
  const yearPart = `${y} year${y !== 1 ? 's' : ''}`;
  const monthPart = `${m} month${m !== 1 ? 's' : ''}`;
  return y > 0 ? `${yearPart}, ${monthPart}` : monthPart;
}

/**
 * "Age band: 3-5" under the age.
 *
 * The band itself ('0-2', '3-5', '6-12', '13-17') is a derived key the plan
 * generator reads — it is never translated, only its label.
 */
export function ageBandLabel(band: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `Age band: ${band}`,
    `Rango de edad: ${band}`,
    `Nhóm tuổi: ${band}`,
  );
}

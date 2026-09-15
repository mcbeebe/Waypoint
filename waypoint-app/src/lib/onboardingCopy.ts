/**
 * Every user-visible string in the six-step onboarding flow (initiative 009).
 *
 * WHAT THIS DOES AND DOES NOT DEPEND ON. It translates the flow. It does NOT
 * by itself make a Spanish-speaking parent SEE the Spanish: `I18nProvider`
 * defaults to English and reads only a stored preference, which nothing
 * writes before Settings. Device-language detection lives on a separate
 * branch; until that lands, this copy is reachable only by a parent who
 * completed onboarding in English and switched language afterwards. An
 * earlier draft of this file asserted detection already existed — it does not
 * on this branch, and an adversarial review was right to call that out.
 *
 * WHY IT IS STILL WORTH LANDING. The moment detection is in, the alternative
 * is a Spanish Welcome followed immediately by an English six-step form,
 * which reads worse than an app that had been English throughout — like a
 * translation that gave up at the door.
 *
 * VALUES ARE NOT TRANSLATABLE. The `value` on every option here is persisted:
 * `children.rc_status`, `children.iep_status`, `families.insurance_carrier`,
 * read by `planGenerator`, `gapRules`, `homeTriage`, `actionReconcile` and
 * `HomeScreen`. A translated value writes a row the rest of the app cannot
 * read — silently, permanently, and only for the families this work exists to
 * serve. `onboardingCopy.test.ts` pins the values locale-invariant AND
 * identical to `profileCopy.ts`'s grids, because the two screens edit the same
 * three columns.
 *
 * THE OPTION DESCRIPTIONS ARE SPEC TEXT, NOT PROSE. A parent skims them to
 * pick a bucket, and the bucket drives their plan. A free translation already
 * cost one: the Spanish for `known` once read "pero no tengo servicios",
 * which describes everyone who is not `active` — a parent with a pending
 * referral would have recognised themselves and chosen `known` over
 * `applied`, losing the follow-up action `planGenerator` gates on `applied`.
 * Translate these tightly.
 *
 * REGISTER. Spanish is **usted** and impersonal — never yo/nosotros, which
 * the English ellipsis does not imply; the child is **"su hijo/a"**.
 * Vietnamese uses **"quý vị"** / **"con quý vị"**. Agency names are spelled
 * out ("Centro Regional", "Trung tâm Khu vực") rather than abbreviated: "RC"
 * is a real term of art in this community, "CR" and "TTKV" are not.
 *
 * These are careful drafts pending native-speaker review, per the house rule
 * in `eligibility.ts`.
 */
import type { FunnelLocale } from '@/lib/eligibility';

/**
 * One string in all three languages.
 *
 * A `Record` rather than positional arguments, because the initiative's intent
 * doc requires it and the reason is concrete: with `pick(locale, en, es, vi)`
 * a transposed Spanish/Vietnamese pair type-checks and passes every parity
 * test — the values still differ from English, so nothing notices, and a
 * Spanish parent reads Vietnamese. Named keys make that a visible mistake.
 */
type Tri = Record<FunnelLocale, string>;

const L = (locale: FunnelLocale, s: Tri): string => s[locale];

export interface OnboardingOption {
  value: string;
  label: string;
  emoji: string;
  description?: string;
}

/** Step 3 — Regional Center status. Values persist to `children.rc_status`. */
export function rcStatusOptions(locale: FunnelLocale = 'en'): OnboardingOption[] {
  const t = (s: Tri) => L(locale, s);
  return [
    {
      value: 'unknown',
      emoji: '❓',
      label: t({ en: "I don't know", es: 'No sé', vi: 'Tôi không biết' }),
      description: t({
        en: 'Not sure what Regional Center is',
        es: 'No sabe qué es un Centro Regional',
        vi: 'Chưa rõ Trung tâm Khu vực là gì',
      }),
    },
    {
      value: 'known',
      emoji: '📍',
      label: t({
        en: 'I know my RC',
        es: 'Sé cuál es mi Centro Regional',
        vi: 'Tôi biết Trung tâm Khu vực của mình',
      }),
      description: t({
        en: 'Know which one but not connected',
        // NOT "no tengo servicios" — that is true of `applied` too, and a
        // parent with a pending referral would pick the wrong bucket.
        es: 'Sabe cuál le corresponde, pero aún no se ha comunicado',
        vi: 'Biết là trung tâm nào nhưng chưa liên hệ',
      }),
    },
    {
      value: 'applied',
      emoji: '📝',
      label: t({ en: 'Applied / In process', es: 'Solicitado / En trámite', vi: 'Đã nộp đơn / Đang xử lý' }),
      description: t({
        en: 'Referral or intake started',
        es: 'Referencia o entrevista inicial ya iniciada',
        vi: 'Đã bắt đầu giới thiệu hoặc tiếp nhận',
      }),
    },
    {
      value: 'active',
      emoji: '✅',
      label: t({ en: 'Active client', es: 'Cliente activo', vi: 'Đang nhận dịch vụ' }),
      description: t({
        en: 'Currently receiving RC services',
        es: 'Ya recibe servicios del Centro Regional',
        vi: 'Hiện đang nhận dịch vụ của Trung tâm Khu vực',
      }),
    },
  ];
}

/** Step 4 — IEP status. Values persist to `children.iep_status`. */
export function iepStatusOptions(locale: FunnelLocale = 'en'): OnboardingOption[] {
  const t = (s: Tri) => L(locale, s);
  return [
    {
      value: 'no',
      emoji: '📭',
      label: t({ en: 'No IEP', es: 'Sin IEP', vi: 'Không có IEP' }),
      description: t({ en: 'Never requested', es: 'Nunca se ha solicitado', vi: 'Chưa từng yêu cầu' }),
    },
    {
      value: 'unknown',
      emoji: '❓',
      label: t({ en: "Don't know", es: 'No sé', vi: 'Không biết' }),
      description: t({
        en: 'Not sure if child has one',
        es: 'Sin certeza de si su hijo/a tiene uno',
        vi: 'Chưa rõ con có hay không',
      }),
    },
    {
      value: 'eval_done',
      emoji: '🔍',
      label: t({ en: 'Evaluation done', es: 'Evaluación hecha', vi: 'Đã đánh giá xong' }),
      description: t({
        en: 'Assessed but no IEP yet',
        // Impersonal `se hizo`, not `lo evaluaron` — the masculine clitic
        // would gender a child this file otherwise writes as "hijo/a".
        es: 'Ya se hizo la evaluación, pero aún no hay IEP',
        vi: 'Đã đánh giá nhưng chưa có IEP',
      }),
    },
    {
      value: 'active',
      emoji: '✅',
      label: t({ en: 'Active IEP', es: 'IEP activo', vi: 'IEP đang hiệu lực' }),
      description: t({
        en: 'Currently has IEP in place',
        // Names the child: bare "Ya tiene" is ambiguous between usted and
        // él/ella in a screen addressed to the parent.
        es: 'Su hijo/a ya tiene un IEP vigente',
        vi: 'Con quý vị hiện đang có IEP',
      }),
    },
    {
      value: 'na',
      emoji: '➖',
      label: t({ en: 'Not applicable', es: 'No aplica', vi: 'Không áp dụng' }),
      description: t({
        en: 'Child not school age',
        es: 'Su hijo/a aún no tiene edad escolar',
        vi: 'Con chưa đến tuổi đi học',
      }),
    },
  ];
}

/** Step 5 — insurance. Values persist to `families.insurance_carrier`. */
export function insuranceOptions(locale: FunnelLocale = 'en'): OnboardingOption[] {
  const t = (s: Tri) => L(locale, s);
  return [
    {
      value: 'private',
      emoji: '🏥',
      label: t({ en: 'Private insurance', es: 'Seguro privado', vi: 'Bảo hiểm tư nhân' }),
    },
    // Medi-Cal is a proper noun — the programme is called that in every language.
    { value: 'medicaid', label: 'Medi-Cal', emoji: '🏛️' },
    { value: 'both', emoji: '🔄', label: t({ en: 'Both', es: 'Ambos', vi: 'Cả hai' }) },
    {
      value: 'none',
      emoji: '❓',
      label: t({ en: 'None / Unsure', es: 'Ninguno / No sé', vi: 'Không có / Không chắc' }),
    },
  ];
}

export interface OnboardingCopy {
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

  chooseCounty: string;
  cancel: string;

  back: string;
  backA11y: string;
  next: string;
  letsGo: string;

  setupFailedTitle: string;
  setupFailedBody: string;
}

/** Fixed strings for the onboarding flow, for one locale. */
export function onboardingCopy(locale: FunnelLocale = 'en'): OnboardingCopy {
  const t = (s: Tri) => L(locale, s);
  return {
    // "Bienvenido" gender-marks the reader, who is usually a mother. The
    // neutral usted form costs nothing.
    welcomeTitle: t({
      en: 'Welcome to Waypoint',
      es: 'Le damos la bienvenida a Waypoint',
      vi: 'Chào mừng đến với Waypoint',
    }),
    welcomeSubtitle: t({
      en: "Let's get to know your family",
      es: 'Queremos conocer a su familia',
      vi: 'Chúng tôi muốn hiểu về gia đình quý vị',
    }),
    parentFirstName: t({ en: 'Your first name', es: 'Su nombre', vi: 'Tên của quý vị' }),
    parentFirstNameExample: t({ en: 'e.g., Sarah', es: 'p. ej., Sara', vi: 'ví dụ: Lan' }),
    childFirstName: t({ en: "Child's first name", es: 'Nombre de su hijo/a', vi: 'Tên con quý vị' }),
    childFirstNameExample: t({ en: 'e.g., Maya', es: 'p. ej., Maya', vi: 'ví dụ: Minh' }),
    zipCode: t({ en: 'ZIP code', es: 'Código postal', vi: 'Mã bưu điện' }),
    zipExample: t({ en: 'e.g., 94610', es: 'p. ej., 94610', vi: 'ví dụ: 94610' }),
    findByCounty: t({
      en: "Don't know your ZIP? Find by county →",
      es: '¿No sabe su código postal? Búsquelo por condado →',
      vi: 'Không biết mã bưu điện? Tìm theo quận →',
    }),
    findByCountyA11y: t({
      en: 'Find your Regional Center by county instead',
      es: 'Buscar su Centro Regional por condado',
      vi: 'Tìm Trung tâm Khu vực theo quận',
    }),
    emailOptional: t({
      en: 'Email (optional)',
      es: 'Correo electrónico (opcional)',
      vi: 'Email (không bắt buộc)',
    }),
    emailHint: t({
      en: 'For deadline reminders',
      es: 'Para recordatorios de fechas límite',
      vi: 'Để nhắc hạn chót',
    }),

    diagnosisTitle: t({
      en: "Child's Diagnosis",
      es: 'Diagnóstico de su hijo/a',
      vi: 'Chẩn đoán của con quý vị',
    }),
    // Keeps the possessor: the subtitle below says "su edad", which without
    // an antecedent on screen reads as the PARENT's age in an usted register.
    birthdayTitle: t({
      en: "Child's Birthday",
      es: 'Fecha de nacimiento de su hijo/a',
      vi: 'Ngày sinh của con',
    }),
    birthdaySubtitle: t({
      en: 'This helps us give age-appropriate guidance',
      es: 'Esto nos ayuda a dar orientación adecuada para su edad',
      vi: 'Điều này giúp chúng tôi đưa ra hướng dẫn phù hợp với độ tuổi',
    }),
    birthdayA11y: t({
      en: "Child's birthday",
      es: 'Fecha de nacimiento de su hijo/a',
      vi: 'Ngày sinh của con quý vị',
    }),
    tapToSelectBirthday: t({
      en: 'Tap to select birthday',
      es: 'Toque para elegir la fecha de nacimiento',
      vi: 'Chạm để chọn ngày sinh',
    }),
    rcStatusTitle: t({
      en: 'Regional Center Status',
      es: 'Estado con el Centro Regional',
      vi: 'Tình trạng với Trung tâm Khu vực',
    }),
    rcStatusSubtitle: t({
      en: 'Regional Centers provide services under the Lanterman Act',
      es: 'Los Centros Regionales brindan servicios bajo la Ley Lanterman',
      vi: 'Các Trung tâm Khu vực cung cấp dịch vụ theo Đạo luật Lanterman',
    }),
    iepStatusTitle: t({ en: 'IEP Status', es: 'Estado del IEP', vi: 'Tình trạng IEP' }),
    iepStatusSubtitle: t({
      en: 'Individualized Education Program at school',
      es: 'Programa de Educación Individualizado en la escuela',
      vi: 'Chương trình Giáo dục Cá nhân hóa ở trường',
    }),
    insuranceTitle: t({ en: 'Insurance Type', es: 'Tipo de seguro', vi: 'Loại bảo hiểm' }),
    insuranceSubtitle: t({
      en: 'This determines which benefits and services apply',
      es: 'Esto determina qué beneficios y servicios le corresponden',
      vi: 'Điều này quyết định những trợ cấp và dịch vụ nào áp dụng',
    }),

    chooseCounty: t({ en: 'Choose your county', es: 'Elija su condado', vi: 'Chọn quận của quý vị' }),
    cancel: t({ en: 'Cancel', es: 'Cancelar', vi: 'Hủy' }),

    back: t({ en: 'Back', es: 'Atrás', vi: 'Quay lại' }),
    backA11y: t({ en: 'Go back', es: 'Volver atrás', vi: 'Quay lại' }),
    next: t({ en: 'Next', es: 'Siguiente', vi: 'Tiếp theo' }),
    // The reward at the end of six steps — it should sound like one.
    letsGo: t({ en: "Let's go!", es: '¡Vamos!', vi: 'Bắt đầu thôi!' }),

    setupFailedTitle: t({
      en: 'Could not finish setup',
      es: 'No se pudo terminar la configuración',
      vi: 'Không hoàn tất được thiết lập',
    }),
    setupFailedBody: t({
      en: 'Failed to save. Please try again.',
      es: 'No se pudo guardar. Inténtelo de nuevo.',
      vi: 'Không lưu được. Vui lòng thử lại.',
    }),
  };
}

// ─── Interpolated ────────────────────────────────────────────────────────────

/** "County: Alameda ✓ (tap to change)" once a county has been picked. */
export function countyChosen(county: string, locale: FunnelLocale = 'en'): string {
  return L(locale, {
    en: `County: ${county} ✓ (tap to change)`,
    es: `Condado: ${county} ✓ (toque para cambiar)`,
    vi: `Quận: ${county} ✓ (chạm để thay đổi)`,
  });
}

/**
 * The child's age, as the badge under the birthday picker shows it.
 *
 * Built per language rather than by appending an "s": Spanish inflects both
 * nouns independently ("1 año, 2 meses"), and Vietnamese has no grammatical
 * plural at all — the numeral carries it. An English-shaped template would
 * read "1 años" to a family reading their own child's age back.
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
 * The band ('0-2', '3-5', '6-12', '13-17') is a derived key, never translated.
 */
export function ageBandLabel(band: string, locale: FunnelLocale = 'en'): string {
  return L(locale, {
    en: `Age band: ${band}`,
    es: `Rango de edad: ${band}`,
    vi: `Nhóm tuổi: ${band}`,
  });
}

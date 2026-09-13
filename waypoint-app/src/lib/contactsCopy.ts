/**
 * Every user-visible string in `ContactsCard`, in all three languages
 * (initiative 009, PR 1).
 *
 * WHY THIS EXISTS SEPARATELY. The card renders inside Profile under the
 * "Key Contacts" heading. Translating the heading and leaving ~35 English
 * strings directly beneath it reads worse than a fully English screen —
 * a half-finished translation tells a family the Spanish is an afterthought.
 *
 * `ContactOrg` VALUES ('school', 'regional_center', …) are a persisted union
 * (`hooks/useContacts.ts:10`) and never translate; only their labels do.
 *
 * Register matches the corpus: Spanish is usted, the child is "su hijo/a";
 * Vietnamese uses "quý vị" / "con quý vị".
 */
import type { FunnelLocale } from '@/lib/eligibility';
import type { ContactOrg } from '@/hooks/useContacts';

function pick(locale: FunnelLocale, en: string, es: string, vi: string): string {
  return locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export interface OrgOption {
  value: ContactOrg;
  label: string;
  emoji: string;
}

/** The organisation chips. Values are persisted; labels are not. */
export function orgOptions(locale: FunnelLocale = 'en'): OrgOption[] {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return [
    { value: 'school', label: L('School', 'Escuela', 'Trường học'), emoji: '🏫' },
    { value: 'regional_center', label: L('Regional Center', 'Centro Regional', 'Trung tâm Khu vực'), emoji: '🏛️' },
    { value: 'insurance', label: L('Insurance', 'Seguro', 'Bảo hiểm'), emoji: '🏥' },
    { value: 'medical', label: L('Medical', 'Médico', 'Y tế'), emoji: '⚕️' },
    { value: 'other', label: L('Other', 'Otro', 'Khác'), emoji: '📋' },
  ];
}

/**
 * Quick-fill chips for the role field. These are free text that ends up in
 * `contacts.role` and then inside generated letters, so a Spanish-speaking
 * parent should be offered Spanish role names — the letter writer already
 * drafts in the family's language.
 */
export function roleSuggestions(locale: FunnelLocale = 'en'): string[] {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return [
    L('Service Coordinator', 'Coordinador de Servicios', 'Điều phối viên Dịch vụ'),
    L('SpEd Teacher', 'Maestro de Educación Especial', 'Giáo viên Giáo dục Đặc biệt'),
    L('Gen Ed Teacher', 'Maestro de Educación General', 'Giáo viên Giáo dục Phổ thông'),
    L('Case Manager', 'Gestor del Caso', 'Quản lý Hồ sơ'),
    L('Principal', 'Director', 'Hiệu trưởng'),
    L('School Psychologist', 'Psicólogo Escolar', 'Chuyên viên Tâm lý Học đường'),
    L('Pediatrician', 'Pediatra', 'Bác sĩ Nhi khoa'),
    L('Insurance Case Worker', 'Agente del Seguro', 'Nhân viên Bảo hiểm'),
  ];
}

export interface ContactsCopy {
  intro: string;
  tapToAdd: string;
  editHint: string;
  addContact: string;
  addContactA11y: string;
  name: string;
  nameA11y: string;
  namePlaceholder: string;
  role: string;
  roleA11y: string;
  rolePlaceholder: string;
  organization: string;
  email: string;
  emailA11y: string;
  emailPlaceholder: string;
  phone: string;
  phoneA11y: string;
  phonePlaceholder: string;
  save: string;
  saveA11y: string;
  cancel: string;
  remove: string;
  removeBody: string;
  contactSaved: string;
  contactRemoved: string;
  cantSave: string;
  cantRemove: string;
}

/** Fixed strings for the contacts card, for one locale. */
export function contactsCopy(locale: FunnelLocale = 'en'): ContactsCopy {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return {
    intro: L(
      "Your child's team — these names auto-fill into generated letters, email recipients, and the Waypoint Navigator's suggestions.",
      'El equipo de su hijo/a — estos nombres se completan automáticamente en las cartas generadas, en los destinatarios de correo y en las sugerencias del Navegador de Waypoint.',
      'Nhóm hỗ trợ con quý vị — những tên này tự động điền vào thư được tạo, người nhận email, và gợi ý của Trợ Lý Waypoint.',
    ),
    tapToAdd: L('Tap to add details', 'Toque para agregar detalles', 'Chạm để thêm chi tiết'),
    editHint: L('Edit ›', 'Editar ›', 'Sửa ›'),
    addContact: L('＋ Add a contact', '＋ Agregar un contacto', '＋ Thêm một liên hệ'),
    addContactA11y: L('Add a contact', 'Agregar un contacto', 'Thêm một liên hệ'),
    name: L('Name', 'Nombre', 'Tên'),
    nameA11y: L('Contact name', 'Nombre del contacto', 'Tên liên hệ'),
    namePlaceholder: L('e.g., Maria Lopez', 'p. ej., María López', 'ví dụ: Nguyễn Thị Lan'),
    role: L('Role', 'Función', 'Vai trò'),
    roleA11y: L('Contact role', 'Función del contacto', 'Vai trò của liên hệ'),
    rolePlaceholder: L('e.g., Service Coordinator', 'p. ej., Coordinador de Servicios', 'ví dụ: Điều phối viên Dịch vụ'),
    organization: L('Organization', 'Organización', 'Tổ chức'),
    email: L('Email', 'Correo electrónico', 'Email'),
    emailA11y: L('Contact email', 'Correo del contacto', 'Email của liên hệ'),
    emailPlaceholder: 'name@district.org',
    phone: L('Phone', 'Teléfono', 'Điện thoại'),
    phoneA11y: L('Contact phone', 'Teléfono del contacto', 'Điện thoại của liên hệ'),
    phonePlaceholder: '(510) 555-0100',
    save: L('Save', 'Guardar', 'Lưu'),
    saveA11y: L('Save contact', 'Guardar el contacto', 'Lưu liên hệ'),
    cancel: L('Cancel', 'Cancelar', 'Hủy'),
    remove: L('Remove', 'Eliminar', 'Xóa'),
    removeBody: L(
      'They will no longer auto-fill into letters and emails.',
      'Ya no se completarán automáticamente en cartas ni correos.',
      'Người này sẽ không còn tự động điền vào thư và email.',
    ),
    contactSaved: L('Contact saved', 'Contacto guardado', 'Đã lưu liên hệ'),
    contactRemoved: L('Contact removed', 'Contacto eliminado', 'Đã xóa liên hệ'),
    cantSave: L("Couldn't save — try again.", 'No se pudo guardar — inténtelo de nuevo.', 'Không lưu được — vui lòng thử lại.'),
    cantRemove: L("Couldn't remove — try again.", 'No se pudo eliminar — inténtelo de nuevo.', 'Không xóa được — vui lòng thử lại.'),
  };
}

/** Screen-reader label for the row that opens a contact for editing. */
export function editContactLabel(name: string, locale: FunnelLocale = 'en'): string {
  return pick(locale, `Edit contact ${name}`, `Editar el contacto ${name}`, `Sửa liên hệ ${name}`);
}

/** Confirm-dialog title for removing a contact. */
export function removeContactTitle(name: string, locale: FunnelLocale = 'en'): string {
  return pick(locale, `Remove ${name}?`, `¿Eliminar a ${name}?`, `Xóa ${name}?`);
}

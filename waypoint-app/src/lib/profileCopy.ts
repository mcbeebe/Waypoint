/**
 * Every user-visible string on the Profile / settings screen, in all three
 * languages (initiative 009, PR 1).
 *
 * WHY THIS MODULE EXISTS. Profile is the screen that *hosts the language
 * picker*, and it was the least translated surface in the app — 42 rendered
 * strings plus a11y labels, placeholders, toasts and dialogs, all hardcoded
 * English. A parent who switched Waypoint to Español and opened Ajustes to
 * confirm the change was met by "Family Info", "Your first name" and
 * "Delete account & all data". That is the exact spot where trust in the
 * translation breaks.
 *
 * The copy lives here rather than inline because there is too much of it to
 * read inside JSX, and because pulling it out makes it testable on its own —
 * `profileCopy.test.ts` asserts no Spanish or Vietnamese value is left equal
 * to its English twin.
 *
 * REGISTER, matched to the existing corpus (not invented here):
 *   - Spanish is **usted** throughout (232 usted-form hits vs 9 tú-form
 *     across the existing locale records), and the child is **"su hijo/a"**.
 *   - Vietnamese uses **"quý vị"** and **"con quý vị"**.
 *
 * TONE. Nothing here asks an agency for anything, so the escalation ladder
 * does not apply — but the same restraint does: these strings describe the
 * parent's own data and settings, and must not acquire urgency, blame or
 * legal framing that the English does not have.
 */
import type { FunnelLocale } from '@/lib/eligibility';

/** Pick one of three. Locale is exhaustive, so a dropped language is a type error. */
function pick(locale: FunnelLocale, en: string, es: string, vi: string): string {
  return locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export interface ProfileCopy {
  // Section headings
  familyInfo: string;
  keyContacts: string;
  children: string;
  diagnosis: string;
  rcStatus: string;
  iepStatus: string;
  insurance: string;
  displayAccessibility: string;
  privacyAi: string;
  yourData: string;
  whatWaypointKnows: string;
  googleAccount: string;

  // Family info fields
  yourFirstName: string;
  yourLastName: string;
  yourLastNameHint: string;
  email: string;
  emailHint: string;
  emailA11y: string;
  phone: string;
  phoneHint: string;
  phoneA11y: string;
  childFirstName: string;
  zipCode: string;
  schoolDistrict: string;

  // Example placeholders ("e.g., …")
  egParentName: string;
  egChildName: string;
  egNewChildName: string;
  egZip: string;
  egDistrict: string;
  egSchool: string;
  egGrade: string;

  // Children management
  firstName: string;
  birthday: string;
  birthdayOptional: string;
  school: string;
  schoolNameA11y: string;
  grade: string;
  newChildFirstName: string;
  addAChild: string;
  removeChild: string;
  makePrimary: string;
  editHint: string;

  // Buttons + generic
  save: string;
  saveChanges: string;
  cancel: string;
  add: string;
  replay: string;
  view: string;
  working: string;

  // Display & accessibility
  textSize: string;
  textSizeHint: string;
  appTour: string;
  appTourHint: string;
  replayTourA11y: string;
  howWaypointWorks: string;
  howWaypointWorksHint: string;
  howWaypointWorksA11y: string;

  // Privacy & AI
  aiOn: string;
  aiOff: string;
  aiIntro: string;
  aiOnDetail: string;
  aiOffDetail: string;
  turnOffAi: string;
  enableAi: string;

  // Data export
  exportBlurb: string;
  exportButton: string;
  exportPreparing: string;

  // Memories
  memoriesBlurb: string;
  memoriesEmpty: string;
  forgetEverything: string;
  forgetAllA11y: string;
  forgetAllTitle: string;
  forgetAllBody: string;
  forgetAllConfirm: string;

  // Google
  googleDisconnected: string;
  addGmail: string;
  disconnectGoogle: string;
  connectGoogle: string;

  // Danger zone + footer
  deleteAccount: string;
  deleteAccountA11y: string;
  version: string;

  // Dialogs — confirmations and alerts raised from the handlers. These are
  // the highest-stakes strings on the screen (account deletion, withdrawing
  // AI consent), so they are translated with the rest, not left in English.
  googleConnectFailTitle: string;
  googleNotConfigured: string;
  tryAgain: string;
  disconnectGoogleTitle: string;
  disconnectGoogleBody: string;
  disconnectConfirm: string;
  disconnectFailTitle: string;
  aiOffTitle: string;
  aiOffBody: string;
  aiOffConfirm: string;
  couldNotSaveTitle: string;
  tryAgainMoment: string;
  aiEnabledTitle: string;
  aiEnabledBody: string;
  aiEnableFailTitle: string;
  aiEnableFailBody: string;
  deleteTitle: string;
  deleteBody: string;
  deleteConfirm: string;
  deleteSureTitle: string;
  deleteSureBody: string;
  deleteSureConfirm: string;
  deleteFailTitle: string;
  deleteFailBody: string;
  deleteFailOffline: string;
  signOutTitle: string;
  signOutBody: string;

  // Toasts
  childUpdated: string;
  saved: string;
  cantSaveChange: string;
  someChangesFailed: string;
  enterChildName: string;
  childAddFailed: string;
  profileUpdated: string;
  profileUpdatedPlan: string;
  saveProfileFailed: string;
  exportReady: string;
  exportFailed: string;
  forgotten: string;
  allForgotten: string;
  tourWillReplay: string;
  cantSave: string;
  cantRemove: string;
  cantUpdate: string;
  cantClear: string;
}

/** Every fixed string on the Profile screen, for one locale. */
export function profileCopy(locale: FunnelLocale = 'en'): ProfileCopy {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return {
    familyInfo: L('Family Info', 'Información familiar', 'Thông tin gia đình'),
    keyContacts: L('Key Contacts', 'Contactos clave', 'Liên hệ quan trọng'),
    children: L('Children', 'Hijos', 'Con cái'),
    diagnosis: L('Diagnosis', 'Diagnóstico', 'Chẩn đoán'),
    rcStatus: L('Regional Center Status', 'Estado con el Centro Regional', 'Tình trạng với Trung tâm Khu vực'),
    iepStatus: L('IEP Status', 'Estado del IEP', 'Tình trạng IEP'),
    insurance: L('Insurance', 'Seguro médico', 'Bảo hiểm'),
    displayAccessibility: L('Display & Accessibility', 'Pantalla y accesibilidad', 'Hiển thị và trợ năng'),
    privacyAi: L('Privacy & AI', 'Privacidad e IA', 'Quyền riêng tư và AI'),
    yourData: L('Your Data', 'Sus datos', 'Dữ liệu của quý vị'),
    whatWaypointKnows: L('What Waypoint Knows', 'Lo que Waypoint sabe', 'Những gì Waypoint biết'),
    googleAccount: L('Google Account', 'Cuenta de Google', 'Tài khoản Google'),

    yourFirstName: L('Your first name', 'Su nombre', 'Tên của quý vị'),
    yourLastName: L('Your last name', 'Sus apellidos', 'Họ của quý vị'),
    yourLastNameHint: L(
      'Used to sign generated letters',
      'Se usa para firmar las cartas generadas',
      'Dùng để ký các thư được tạo',
    ),
    email: L('Email', 'Correo electrónico', 'Email'),
    emailHint: L('For deadline reminders', 'Para recordatorios de fechas límite', 'Để nhắc hạn chót'),
    emailA11y: L('Email address', 'Dirección de correo electrónico', 'Địa chỉ email'),
    phone: L('Phone number', 'Número de teléfono', 'Số điện thoại'),
    phoneHint: L(
      'Auto-fills into letters and emails',
      'Se completa automáticamente en cartas y correos',
      'Tự động điền vào thư và email',
    ),
    phoneA11y: L('Your phone number', 'Su número de teléfono', 'Số điện thoại của quý vị'),
    childFirstName: L("Child's first name", 'Nombre de su hijo/a', 'Tên con quý vị'),
    zipCode: L('ZIP code', 'Código postal', 'Mã bưu điện'),
    schoolDistrict: L('School district', 'Distrito escolar', 'Học khu'),

    egParentName: L('e.g., Sarah', 'p. ej., Sara', 'ví dụ: Lan'),
    egChildName: L('e.g., Maya', 'p. ej., Maya', 'ví dụ: Minh'),
    egNewChildName: L('e.g., Leo', 'p. ej., Leo', 'ví dụ: Nam'),
    egZip: L('e.g., 94610', 'p. ej., 94610', 'ví dụ: 94610'),
    egDistrict: L('e.g., Oakland Unified', 'p. ej., Oakland Unified', 'ví dụ: Oakland Unified'),
    egSchool: L('e.g., Glenview Elementary', 'p. ej., Glenview Elementary', 'ví dụ: Glenview Elementary'),
    egGrade: L('e.g., 3rd', 'p. ej., 3.º', 'ví dụ: 3'),

    firstName: L('First name', 'Nombre', 'Tên'),
    birthday: L('Birthday', 'Fecha de nacimiento', 'Ngày sinh'),
    birthdayOptional: L('Birthday (optional)', 'Fecha de nacimiento (opcional)', 'Ngày sinh (không bắt buộc)'),
    school: L('School', 'Escuela', 'Trường học'),
    schoolNameA11y: L('School name', 'Nombre de la escuela', 'Tên trường'),
    grade: L('Grade', 'Grado', 'Lớp'),
    newChildFirstName: L("New child's first name", 'Nombre del nuevo hijo/a', 'Tên của con mới'),
    addAChild: L('＋ Add a child', '＋ Agregar un hijo/a', '＋ Thêm một con'),
    removeChild: L('Remove child', 'Eliminar hijo/a', 'Xóa con'),
    makePrimary: L('⭐ Make primary', '⭐ Hacer principal', '⭐ Đặt làm chính'),
    editHint: L('Edit ›', 'Editar ›', 'Sửa ›'),

    save: L('Save', 'Guardar', 'Lưu'),
    saveChanges: L('Save Changes', 'Guardar cambios', 'Lưu thay đổi'),
    cancel: L('Cancel', 'Cancelar', 'Hủy'),
    add: L('Add', 'Agregar', 'Thêm'),
    replay: L('Replay', 'Repetir', 'Xem lại'),
    view: L('View', 'Ver', 'Xem'),
    working: L('Working…', 'Procesando…', 'Đang xử lý…'),

    textSize: L('Text size', 'Tamaño del texto', 'Cỡ chữ'),
    textSizeHint: L(
      'Applies to reading-heavy screens like actions and analyses.',
      'Se aplica a las pantallas con más texto, como acciones y análisis.',
      'Áp dụng cho các màn hình nhiều chữ như hành động và phân tích.',
    ),
    appTour: L('App tour', 'Recorrido por la app', 'Hướng dẫn ứng dụng'),
    appTourHint: L(
      'Replay the 4-step feature intro on the Home screen.',
      'Repita la introducción de 4 pasos en la pantalla de Inicio.',
      'Xem lại phần giới thiệu 4 bước trên màn hình Trang chủ.',
    ),
    replayTourA11y: L('Replay the app tour', 'Repetir el recorrido por la app', 'Xem lại hướng dẫn ứng dụng'),
    howWaypointWorks: L('How Waypoint works', 'Cómo funciona Waypoint', 'Waypoint hoạt động như thế nào'),
    howWaypointWorksHint: L(
      'The Tell → Plan → Act → Track loop, and what happens behind the scenes.',
      'El ciclo Contar → Planear → Actuar → Seguir, y lo que ocurre detrás.',
      'Vòng lặp Kể → Lập kế hoạch → Hành động → Theo dõi, và điều diễn ra phía sau.',
    ),
    howWaypointWorksA11y: L(
      'See how Waypoint works',
      'Ver cómo funciona Waypoint',
      'Xem Waypoint hoạt động như thế nào',
    ),

    aiOn: L('ON', 'ACTIVADAS', 'BẬT'),
    aiOff: L('OFF', 'DESACTIVADAS', 'TẮT'),
    aiIntro: L(
      'AI features (Waypoint Navigator, document analysis) are',
      'Las funciones de IA (Navegador de Waypoint, análisis de documentos) están',
      'Các tính năng AI (Trợ Lý Waypoint, phân tích tài liệu) đang',
    ),
    aiOnDetail: L(
      ' Your questions, your child’s age/diagnoses, and documents you analyze are processed by Anthropic to generate guidance.',
      ' Sus preguntas, la edad y los diagnósticos de su hijo/a, y los documentos que analice son procesados por Anthropic para generar orientación.',
      ' Câu hỏi của quý vị, tuổi và chẩn đoán của con quý vị, và các tài liệu quý vị phân tích được Anthropic xử lý để tạo hướng dẫn.',
    ),
    aiOffDetail: L(
      ' Nothing is sent to the AI provider while this is off.',
      ' No se envía nada al proveedor de IA mientras esto esté desactivado.',
      ' Không có gì được gửi đến nhà cung cấp AI khi tính năng này đang tắt.',
    ),
    turnOffAi: L('Turn off AI features', 'Desactivar las funciones de IA', 'Tắt các tính năng AI'),
    enableAi: L('Enable AI features', 'Activar las funciones de IA', 'Bật các tính năng AI'),

    exportBlurb: L(
      'Download everything Waypoint stores for your family — profile, children, actions, appointments, expenses, chats, contacts, and more — as a single JSON file. Document files stay in Documents, where you can download them individually.',
      'Descargue todo lo que Waypoint guarda de su familia — perfil, hijos, acciones, citas, gastos, conversaciones, contactos y más — en un solo archivo JSON. Los documentos permanecen en Documentos, donde puede descargarlos por separado.',
      'Tải xuống mọi thứ Waypoint lưu về gia đình quý vị — hồ sơ, các con, hành động, cuộc hẹn, chi phí, trò chuyện, liên hệ và hơn thế — trong một tệp JSON duy nhất. Các tệp tài liệu vẫn ở trong mục Tài liệu, nơi quý vị có thể tải riêng từng tệp.',
    ),
    exportButton: L('⬇️ Export my data', '⬇️ Exportar mis datos', '⬇️ Xuất dữ liệu của tôi'),
    exportPreparing: L('Preparing export…', 'Preparando la exportación…', 'Đang chuẩn bị xuất…'),

    memoriesBlurb: L(
      'As you chat, Waypoint remembers durable details — services in place, things in progress, preferences — so it understands your family better over time. You control this list: tap ✕ to make it forget anything.',
      'Mientras conversa, Waypoint recuerda detalles duraderos — servicios activos, cosas en curso, preferencias — para entender mejor a su familia con el tiempo. Usted controla esta lista: toque ✕ para que olvide cualquier cosa.',
      'Khi quý vị trò chuyện, Waypoint ghi nhớ các chi tiết lâu dài — dịch vụ đang có, việc đang tiến hành, sở thích — để hiểu gia đình quý vị hơn theo thời gian. Quý vị kiểm soát danh sách này: chạm ✕ để xóa bất kỳ mục nào.',
    ),
    memoriesEmpty: L(
      'Nothing saved yet — memories appear after your next Waypoint Navigator chat.',
      'Todavía no hay nada guardado — los recuerdos aparecen después de su próxima conversación con el Navegador de Waypoint.',
      'Chưa lưu gì — các ghi nhớ sẽ xuất hiện sau lần trò chuyện tới với Trợ Lý Waypoint.',
    ),
    forgetEverything: L('Forget everything', 'Olvidar todo', 'Quên tất cả'),
    forgetAllA11y: L('Forget all memories', 'Olvidar todos los recuerdos', 'Quên tất cả ghi nhớ'),
    forgetAllTitle: L('Forget everything?', '¿Olvidar todo?', 'Quên tất cả?'),
    forgetAllBody: L(
      'Waypoint will delete all saved memories and start fresh.',
      'Waypoint eliminará todos los recuerdos guardados y empezará de nuevo.',
      'Waypoint sẽ xóa tất cả ghi nhớ đã lưu và bắt đầu lại.',
    ),
    forgetAllConfirm: L('Forget all', 'Olvidar todo', 'Quên tất cả'),

    googleDisconnected: L(
      'Connect Google to sync appointments to your calendar, send emails to schools and agencies, and track their replies — all from Waypoint.',
      'Conecte Google para sincronizar citas con su calendario, enviar correos a escuelas y agencias, y seguir sus respuestas — todo desde Waypoint.',
      'Kết nối Google để đồng bộ cuộc hẹn với lịch của quý vị, gửi email đến trường học và cơ quan, và theo dõi thư trả lời — tất cả từ Waypoint.',
    ),
    addGmail: L('Add Gmail', 'Agregar Gmail', 'Thêm Gmail'),
    disconnectGoogle: L('Disconnect Google', 'Desconectar Google', 'Ngắt kết nối Google'),
    connectGoogle: L(
      'Connect Google (Calendar + Gmail)',
      'Conectar Google (Calendario + Gmail)',
      'Kết nối Google (Lịch + Gmail)',
    ),

    deleteAccount: L('Delete account & all data', 'Eliminar la cuenta y todos los datos', 'Xóa tài khoản và toàn bộ dữ liệu'),
    deleteAccountA11y: L(
      'Delete account and all data',
      'Eliminar la cuenta y todos los datos',
      'Xóa tài khoản và toàn bộ dữ liệu',
    ),
    version: L('Waypoint v1.0.0', 'Waypoint v1.0.0', 'Waypoint v1.0.0'),

    googleConnectFailTitle: L('Could not connect Google', 'No se pudo conectar Google', 'Không kết nối được Google'),
    googleNotConfigured: L(
      'Google sign-in is not configured yet — check the Supabase Google provider setup.',
      'El inicio de sesión con Google aún no está configurado — revise la configuración del proveedor Google en Supabase.',
      'Đăng nhập Google chưa được thiết lập — hãy kiểm tra cấu hình nhà cung cấp Google trong Supabase.',
    ),
    tryAgain: L('Please try again.', 'Inténtelo de nuevo.', 'Vui lòng thử lại.'),
    disconnectGoogleTitle: L('Disconnect Google?', '¿Desconectar Google?', 'Ngắt kết nối Google?'),
    disconnectGoogleBody: L(
      'Calendar sync, sending, and reply tracking will stop working until you reconnect.',
      'La sincronización del calendario, el envío de correos y el seguimiento de respuestas dejarán de funcionar hasta que vuelva a conectarlo.',
      'Đồng bộ lịch, gửi email và theo dõi thư trả lời sẽ ngừng hoạt động cho đến khi quý vị kết nối lại.',
    ),
    disconnectConfirm: L('Disconnect', 'Desconectar', 'Ngắt kết nối'),
    disconnectFailTitle: L('Could not disconnect', 'No se pudo desconectar', 'Không ngắt kết nối được'),
    aiOffTitle: L('Turn off AI features?', '¿Desactivar las funciones de IA?', 'Tắt các tính năng AI?'),
    aiOffBody: L(
      'The Waypoint Navigator and document analysis will stop working until you turn this back on. Everything you have saved stays yours.',
      'El Navegador de Waypoint y el análisis de documentos dejarán de funcionar hasta que vuelva a activarlo. Todo lo que ha guardado sigue siendo suyo.',
      'Trợ Lý Waypoint và phân tích tài liệu sẽ ngừng hoạt động cho đến khi quý vị bật lại. Mọi thứ quý vị đã lưu vẫn thuộc về quý vị.',
    ),
    aiOffConfirm: L('Turn off', 'Desactivar', 'Tắt'),
    couldNotSaveTitle: L('Could not save', 'No se pudo guardar', 'Không lưu được'),
    tryAgainMoment: L(
      'Please try again in a moment.',
      'Inténtelo de nuevo en un momento.',
      'Vui lòng thử lại sau giây lát.',
    ),
    aiEnabledTitle: L('AI features enabled', 'Funciones de IA activadas', 'Đã bật các tính năng AI'),
    aiEnabledBody: L(
      'You can turn this off here any time.',
      'Puede desactivarlas aquí en cualquier momento.',
      'Quý vị có thể tắt lại ở đây bất cứ lúc nào.',
    ),
    aiEnableFailTitle: L(
      'Could not enable AI features',
      'No se pudieron activar las funciones de IA',
      'Không bật được các tính năng AI',
    ),
    aiEnableFailBody: L(
      'The server rejected the change — if this keeps happening, the latest database migration may not be applied yet.',
      'El servidor rechazó el cambio — si esto sigue ocurriendo, es posible que la última migración de la base de datos aún no se haya aplicado.',
      'Máy chủ đã từ chối thay đổi — nếu điều này tiếp diễn, có thể bản cập nhật cơ sở dữ liệu mới nhất chưa được áp dụng.',
    ),
    deleteTitle: L('Delete your account?', '¿Eliminar su cuenta?', 'Xóa tài khoản của quý vị?'),
    deleteBody: L(
      'This permanently deletes your account and ALL data — children, action plans, documents, chats. This cannot be undone.',
      'Esto elimina de forma permanente su cuenta y TODOS los datos — hijos, planes de acción, documentos y conversaciones. No se puede deshacer.',
      'Thao tác này xóa vĩnh viễn tài khoản và TOÀN BỘ dữ liệu của quý vị — các con, kế hoạch hành động, tài liệu, trò chuyện. Không thể hoàn tác.',
    ),
    deleteConfirm: L('Delete everything', 'Eliminar todo', 'Xóa tất cả'),
    deleteSureTitle: L('Are you absolutely sure?', '¿Está completamente seguro?', 'Quý vị có hoàn toàn chắc chắn không?'),
    deleteSureBody: L(
      'There is no way to recover your data after this.',
      'No habrá forma de recuperar sus datos después de esto.',
      'Sau thao tác này, không có cách nào khôi phục dữ liệu của quý vị.',
    ),
    deleteSureConfirm: L('Yes, delete permanently', 'Sí, eliminar permanentemente', 'Vâng, xóa vĩnh viễn'),
    deleteFailTitle: L('Deletion failed', 'No se pudo eliminar', 'Xóa không thành công'),
    deleteFailBody: L(
      'Please try again or email support.',
      'Inténtelo de nuevo o escriba a soporte.',
      'Vui lòng thử lại hoặc gửi email cho bộ phận hỗ trợ.',
    ),
    deleteFailOffline: L(
      'Please check your connection and try again.',
      'Revise su conexión e inténtelo de nuevo.',
      'Vui lòng kiểm tra kết nối và thử lại.',
    ),
    signOutTitle: L('Sign Out', 'Cerrar sesión', 'Đăng xuất'),
    signOutBody: L(
      'Are you sure you want to sign out?',
      '¿Seguro que quiere cerrar sesión?',
      'Quý vị có chắc muốn đăng xuất không?',
    ),
    // Gender-neutral by construction: Spanish adjective agreement on a child
    // of unknown gender would force "actualizado/a" everywhere, so these
    // phrase around the noun instead.
    childUpdated: L('Child updated', 'Datos actualizados', 'Đã cập nhật thông tin con'),
    saved: L('Saved', 'Guardado', 'Đã lưu'),
    cantSaveChange: L(
      "Couldn't save that change — please try again",
      'No se pudo guardar ese cambio — inténtelo de nuevo',
      'Không lưu được thay đổi đó — vui lòng thử lại',
    ),
    someChangesFailed: L(
      "Some changes couldn't be saved — please try again",
      'Algunos cambios no se pudieron guardar — inténtelo de nuevo',
      'Một số thay đổi chưa lưu được — vui lòng thử lại',
    ),
    enterChildName: L(
      "Please enter the child's first name",
      'Por favor escriba el nombre del hijo/a',
      'Vui lòng nhập tên của con',
    ),
    childAddFailed: L(
      'Could not add child — please try again',
      'No se pudo agregar — inténtelo de nuevo',
      'Không thêm được — vui lòng thử lại',
    ),
    profileUpdated: L('Profile updated', 'Perfil actualizado', 'Đã cập nhật hồ sơ'),
    profileUpdatedPlan: L(
      'Profile updated — action plan refreshed to match',
      'Perfil actualizado — el plan de acción se actualizó para coincidir',
      'Đã cập nhật hồ sơ — kế hoạch hành động đã được làm mới cho khớp',
    ),
    saveProfileFailed: L('Failed to save profile', 'No se pudo guardar el perfil', 'Không lưu được hồ sơ'),
    exportReady: L(
      'Export ready — check your downloads',
      'Exportación lista — revise sus descargas',
      'Đã xuất xong — hãy kiểm tra mục tải xuống',
    ),
    exportFailed: L('Export failed', 'La exportación falló', 'Xuất dữ liệu không thành công'),
    forgotten: L('Forgotten', 'Olvidado', 'Đã quên'),
    allForgotten: L('All memories forgotten', 'Todos los recuerdos olvidados', 'Đã quên tất cả ghi nhớ'),
    tourWillReplay: L(
      'Tour will replay next time you open Home.',
      'El recorrido se repetirá la próxima vez que abra Inicio.',
      'Hướng dẫn sẽ chạy lại lần tới khi quý vị mở Trang chủ.',
    ),
    cantSave: L("Couldn't save — try again.", 'No se pudo guardar — inténtelo de nuevo.', 'Không lưu được — vui lòng thử lại.'),
    cantRemove: L("Couldn't remove — try again.", 'No se pudo eliminar — inténtelo de nuevo.', 'Không xóa được — vui lòng thử lại.'),
    cantUpdate: L("Couldn't update.", 'No se pudo actualizar.', 'Không cập nhật được.'),
    cantClear: L("Couldn't clear — try again.", 'No se pudo borrar — inténtelo de nuevo.', 'Không xóa được — vui lòng thử lại.'),
  };
}

// ─── Interpolated strings ────────────────────────────────────────────────────
// Kept as functions because word order around the name differs by language:
// Spanish and Vietnamese both put the possessive after the noun, so a
// naive `${name} + suffix` template would read wrong in two of three.

/** Screen-reader label for the "edit this child" row. */
export function editChildLabel(name: string, locale: FunnelLocale = 'en'): string {
  return pick(locale, `Edit ${name}`, `Editar a ${name}`, `Sửa ${name}`);
}

/** Screen-reader label for the "remove this child" control. */
export function removeChildLabel(name: string, locale: FunnelLocale = 'en'): string {
  return pick(locale, `Remove ${name}`, `Eliminar a ${name}`, `Xóa ${name}`);
}

/** Screen-reader label for the "make this child primary" control. */
export function makePrimaryLabel(name: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `Make ${name} the primary child`,
    `Establecer a ${name} como hijo/a principal`,
    `Đặt ${name} làm con chính`,
  );
}

/**
 * "N actions closed — no longer needed", the toast the intake grids raise
 * when a tapped answer retires steps. Same sentence as the tail of
 * `profileUpdatedClosed`, reached by a different path — it must not be
 * Spanish via one route and English via the other.
 */
export function actionsClosedToast(count: number, locale: FunnelLocale = 'en'): string {
  const n = Math.max(0, Math.floor(count));
  return pick(
    locale,
    `${n} action${n === 1 ? '' : 's'} closed — no longer needed`,
    `${n} ${n === 1 ? 'acción cerrada' : 'acciones cerradas'} — ya no ${n === 1 ? 'es necesaria' : 'son necesarias'}`,
    `Đã đóng ${n} hành động — không còn cần thiết`,
  );
}

/**
 * "Profile updated — plan refreshed, N actions closed as no longer needed."
 *
 * Spanish and Vietnamese pluralize differently from English, so the count
 * and its noun are built per language rather than by appending an "s".
 */
export function profileUpdatedClosed(count: number, locale: FunnelLocale = 'en'): string {
  const n = Math.max(0, Math.floor(count));
  return pick(
    locale,
    `Profile updated — plan refreshed, ${n} action${n === 1 ? '' : 's'} closed as no longer needed`,
    `Perfil actualizado — plan actualizado, ${n} ${n === 1 ? 'acción cerrada' : 'acciones cerradas'} por no ser ya necesaria${n === 1 ? '' : 's'}`,
    // Vietnamese has no grammatical plural — the numeral carries it.
    `Đã cập nhật hồ sơ — kế hoạch đã làm mới, đã đóng ${n} hành động không còn cần thiết`,
  );
}

/** Toast confirming the primary child changed. */
export function nowPrimaryToast(name: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `${name} is now the primary child`,
    `${name} ahora es el hijo/a principal`,
    `${name} giờ là con chính`,
  );
}

/**
 * Toast confirming a new child was added. Spanish phrases around the name
 * ("Se agregó a X") for the same gender-agreement reason as the removal toast.
 */
export function childAddedToast(name: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `${name} has been added to your family`,
    `Se agregó a ${name} a su familia`,
    `Đã thêm ${name} vào gia đình quý vị`,
  );
}

/**
 * Toast confirming a child was removed. The Spanish phrases around the name
 * ("Se eliminó a X") rather than after it ("X eliminado"), which would force
 * an adjective to agree with a gender the app does not know.
 */
export function childRemovedToast(name: string, locale: FunnelLocale = 'en'): string {
  return pick(locale, `${name} removed`, `Se eliminó a ${name}`, `Đã xóa ${name}`);
}

/** Confirm-dialog title for removing a child. */
export function removeChildTitle(name: string, locale: FunnelLocale = 'en'): string {
  return pick(locale, `Remove ${name}?`, `¿Eliminar a ${name}?`, `Xóa ${name}?`);
}

/** Confirm-dialog body for removing a child. */
export function removeChildBody(locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    'Their profile and diagnoses will be removed. Actions and documents stay but lose the child link.',
    'Se eliminarán su perfil y sus diagnósticos. Las acciones y los documentos permanecen, pero pierden el vínculo con el hijo/a.',
    'Hồ sơ và chẩn đoán của con sẽ bị xóa. Các hành động và tài liệu vẫn còn nhưng mất liên kết với con.',
  );
}

/** The "Remove" button inside the remove-child confirm dialog. */
export function removeConfirmLabel(locale: FunnelLocale = 'en'): string {
  return pick(locale, 'Remove', 'Eliminar', 'Xóa');
}

/** Screen-reader label for forgetting one remembered detail. */
export function forgetMemoryLabel(content: string, locale: FunnelLocale = 'en'): string {
  return pick(locale, `Forget: ${content}`, `Olvidar: ${content}`, `Quên: ${content}`);
}

/** The text-size pill's screen-reader label, at the current scale. */
export function textSizeLabel(percent: number, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `Text size ${percent} percent. Tap to change.`,
    `Tamaño del texto ${percent} por ciento. Toque para cambiar.`,
    `Cỡ chữ ${percent} phần trăm. Chạm để thay đổi.`,
  );
}

/** "Born {date}" under a child's name. */
export function bornLabel(date: string, locale: FunnelLocale = 'en'): string {
  return pick(locale, `Born ${date}`, `Nacido/a el ${date}`, `Sinh ngày ${date}`);
}

/** "{grade} grade" in the child's summary line. */
export function gradeLabel(grade: string, locale: FunnelLocale = 'en'): string {
  return pick(locale, `${grade} grade`, `grado ${grade}`, `lớp ${grade}`);
}

/** Google connected, with Gmail scope granted. */
export function googleConnectedFull(account: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `Connected as ${account}. Waypoint can sync your calendar, send emails you approve, and track replies from schools and agencies.`,
    `Conectado como ${account}. Waypoint puede sincronizar su calendario, enviar los correos que usted apruebe, y seguir las respuestas de escuelas y agencias.`,
    `Đã kết nối với ${account}. Waypoint có thể đồng bộ lịch của quý vị, gửi email quý vị chấp thuận, và theo dõi thư trả lời từ trường học và cơ quan.`,
  );
}

/**
 * Google connected, Calendar only. Gmail is a separate restricted-scope
 * opt-in, so this state is common — and claiming sending/reply-tracking here
 * would be a promise the app cannot keep, in any language. Both other-language
 * strings therefore keep the capability conditional ("podrá", "có thể").
 *
 * It names the "Add Gmail" button BELOW this paragraph. The English used to
 * say "Tap Connect Google above", which is the wrong button (that one renders
 * only when disconnected) in the wrong place — a parent following it found
 * nothing. Translating that faithfully would have shipped the same dead end
 * to two more languages, so it is corrected here rather than mirrored.
 */
export function googleConnectedCalendarOnly(account: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `Connected as ${account} — calendar only. Tap Add Gmail below, so Waypoint can send emails you approve and track replies from schools and agencies.`,
    `Conectado como ${account} — solo calendario. Toque Agregar Gmail abajo, y así Waypoint podrá enviar los correos que usted apruebe y seguir las respuestas de escuelas y agencias.`,
    `Đã kết nối với ${account} — chỉ lịch. Chạm Thêm Gmail bên dưới, để Waypoint có thể gửi email quý vị chấp thuận và theo dõi thư trả lời từ trường học và cơ quan.`,
  );
}

/** Fallback when Google returns no email address for the connected account. */
export function yourGoogleAccount(locale: FunnelLocale = 'en'): string {
  return pick(locale, 'your Google account', 'su cuenta de Google', 'tài khoản Google của quý vị');
}

// ─── Option grids ────────────────────────────────────────────────────────────

export interface GridOption {
  value: string;
  label: string;
  emoji: string;
}

/** Regional Center status choices. Values are locale-invariant keys. */
export function rcStatusOptions(locale: FunnelLocale = 'en'): GridOption[] {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return [
    { value: 'unknown', label: L("Don't know", 'No sé', 'Không biết'), emoji: '❓' },
    { value: 'known', label: L('Know my RC', 'Conozco mi CR', 'Biết TTKV của tôi'), emoji: '📍' },
    { value: 'applied', label: L('Applied', 'Solicitado', 'Đã nộp đơn'), emoji: '📝' },
    { value: 'active', label: L('Active', 'Activo', 'Đang hoạt động'), emoji: '✅' },
  ];
}

/** IEP status choices. Values are locale-invariant keys. */
export function iepStatusOptions(locale: FunnelLocale = 'en'): GridOption[] {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return [
    { value: 'no', label: L('No IEP', 'Sin IEP', 'Không có IEP'), emoji: '📭' },
    { value: 'unknown', label: L("Don't know", 'No sé', 'Không biết'), emoji: '❓' },
    { value: 'eval_done', label: L('Eval done', 'Evaluación hecha', 'Đã đánh giá'), emoji: '🔍' },
    { value: 'active', label: L('Active IEP', 'IEP activo', 'IEP đang hiệu lực'), emoji: '✅' },
    { value: 'na', label: L('N/A', 'N/A', 'Không áp dụng'), emoji: '➖' },
  ];
}

/** Insurance choices. "Medi-Cal" is a proper noun and stays as-is. */
export function insuranceOptions(locale: FunnelLocale = 'en'): GridOption[] {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return [
    { value: 'private', label: L('Private', 'Privado', 'Tư nhân'), emoji: '🏥' },
    { value: 'medicaid', label: 'Medi-Cal', emoji: '🏛️' },
    { value: 'both', label: L('Both', 'Ambos', 'Cả hai'), emoji: '🔄' },
    { value: 'none', label: L('None', 'Ninguno', 'Không có'), emoji: '❓' },
  ];
}

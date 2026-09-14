/**
 * Every user-visible string on the Welcome / sign-in screen (initiative 009,
 * PR 3).
 *
 * WHY THIS MATTERS MORE THAN ITS SIZE SUGGESTS. This is the first screen a
 * human being sees. Before this, a Spanish-speaking parent whose phone is in
 * Spanish — the case `src/i18n/resolveLocale.ts` exists to serve — met an
 * English hero, three English value props, English buttons, and, if anything
 * went wrong, an English error telling them what to do about it.
 *
 * The error copy is the part that earns the work. A parent who cannot read
 * "Incorrect email or password" cannot recover from it, and there is nobody
 * to ask: they have not signed up yet, so there is no support channel and no
 * Navigator to ask. A wrong password is where a family silently gives up.
 *
 * REGISTER, matched to the existing corpus: Spanish is **usted**, the child is
 * **"su hijo/a"**; Vietnamese uses **"quý vị"** and **"con quý vị"**.
 *
 * WHAT MUST NOT BE TRANSLATED, and is deliberately absent from this module:
 * `'Sign-in cancelled'` in `WelcomeScreen.tsx` is a SENTINEL compared against
 * what `@/lib/auth` returns, not text shown to anyone. Translating it would
 * make a cancelled Apple/Google sign-in surface as an error banner.
 */
import type { FunnelLocale } from '@/lib/eligibility';

function pick(locale: FunnelLocale, en: string, es: string, vi: string): string {
  return locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export interface WelcomeCopy {
  /** Hero */
  tagline: string;
  valueProp1: string;
  valueProp2: string;
  valueProp3: string;

  /** Provider buttons */
  continueWithApple: string;
  continueWithGoogle: string;
  signUpWithEmail: string;

  /** Email form */
  createAccount: string;
  signIn: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  forgotPassword: string;
  sendingReset: string;
  haveAccount: string;
  noAccount: string;
  backToOptions: string;

  /** Errors and confirmations */
  appleFailed: string;
  googleFailed: string;
  missingCredentials: string;
  passwordTooShort: string;
  genericFailure: string;
  resetSendFailed: string;

  /** Terms footer — split because word order differs (see `termsSuffix`). */
  termsPrefix: string;
  termsOfService: string;
  termsAnd: string;
  privacyPolicy: string;
  termsSuffix: string;
}

/** Fixed strings for the Welcome screen, for one locale. */
export function welcomeCopy(locale: FunnelLocale = 'en'): WelcomeCopy {
  const L = (en: string, es: string, vi: string) => pick(locale, en, es, vi);
  return {
    // The line break is meaningful — it splits the promise into two beats.
    tagline: L(
      "Your child's unexpected journey.\nEvery step, mapped.",
      'El viaje inesperado de su hijo/a.\nCada paso, trazado.',
      'Hành trình không ngờ của con quý vị.\nTừng bước, được vẽ rõ.',
    ),
    // These are promises, not decoration. "free" in the third one is a
    // commitment the product keeps — it survives translation intact.
    valueProp1: L(
      '📍 Answers that cite California law — with the exact words to say',
      '📍 Respuestas que citan la ley de California — con las palabras exactas que decir',
      '📍 Câu trả lời trích dẫn luật California — kèm đúng lời cần nói',
    ),
    valueProp2: L(
      '📋 A personalized action plan for Regional Center, IEP & benefits',
      '📋 Un plan de acción personalizado para el Centro Regional, el IEP y los beneficios',
      '📋 Kế hoạch hành động riêng cho Trung tâm Khu vực, IEP và trợ cấp',
    ),
    valueProp3: L(
      '✉️ Ready-to-send letters, appeals & records requests — free',
      '✉️ Cartas, apelaciones y solicitudes de expedientes listas para enviar — gratis',
      '✉️ Thư, đơn kháng nghị và yêu cầu hồ sơ soạn sẵn — miễn phí',
    ),

    continueWithApple: L('Continue with Apple', 'Continuar con Apple', 'Tiếp tục với Apple'),
    continueWithGoogle: L('Continue with Google', 'Continuar con Google', 'Tiếp tục với Google'),
    signUpWithEmail: L('Sign up with Email', 'Registrarse con correo', 'Đăng ký bằng email'),

    createAccount: L('Create Account', 'Crear cuenta', 'Tạo tài khoản'),
    signIn: L('Sign In', 'Iniciar sesión', 'Đăng nhập'),
    emailPlaceholder: L('Email address', 'Correo electrónico', 'Địa chỉ email'),
    passwordPlaceholder: L(
      'Password (6+ characters)',
      'Contraseña (6 caracteres o más)',
      'Mật khẩu (từ 6 ký tự)',
    ),
    forgotPassword: L('Forgot password?', '¿Olvidó su contraseña?', 'Quên mật khẩu?'),
    sendingReset: L('Sending reset email…', 'Enviando el correo…', 'Đang gửi email…'),
    haveAccount: L(
      'Already have an account? Sign in',
      '¿Ya tiene una cuenta? Inicie sesión',
      'Đã có tài khoản? Đăng nhập',
    ),
    noAccount: L(
      "Don't have an account? Sign up",
      '¿No tiene una cuenta? Regístrese',
      'Chưa có tài khoản? Đăng ký',
    ),
    backToOptions: L('Back to other options', 'Volver a las otras opciones', 'Quay lại các lựa chọn khác'),

    appleFailed: L(
      'Apple Sign-In failed.',
      'No se pudo iniciar sesión con Apple.',
      'Đăng nhập bằng Apple không thành công.',
    ),
    googleFailed: L(
      'Google Sign-In failed.',
      'No se pudo iniciar sesión con Google.',
      'Đăng nhập bằng Google không thành công.',
    ),
    missingCredentials: L(
      'Please enter your email and password.',
      'Escriba su correo electrónico y su contraseña.',
      'Vui lòng nhập email và mật khẩu của quý vị.',
    ),
    passwordTooShort: L(
      'Password must be at least 6 characters.',
      'La contraseña debe tener al menos 6 caracteres.',
      'Mật khẩu phải có ít nhất 6 ký tự.',
    ),
    genericFailure: L(
      'Something went wrong. Please try again.',
      'Algo salió mal. Inténtelo de nuevo.',
      'Đã xảy ra lỗi. Vui lòng thử lại.',
    ),
    resetSendFailed: L(
      'Could not send the reset email. Please try again.',
      'No se pudo enviar el correo de restablecimiento. Inténtelo de nuevo.',
      'Không gửi được email đặt lại mật khẩu. Vui lòng thử lại.',
    ),

    termsPrefix: L(
      'By continuing, you agree to our ',
      'Al continuar, acepta nuestros ',
      'Bằng việc tiếp tục, quý vị đồng ý với ',
    ),
    termsOfService: L('Terms of Service', 'Términos de Servicio', 'Điều khoản Dịch vụ'),
    termsAnd: L(' and ', ' y nuestra ', ' và '),
    privacyPolicy: L('Privacy Policy', 'Política de Privacidad', 'Chính sách Quyền riêng tư'),
    // Vietnamese puts the possessive AFTER the noun phrase, so the sentence
    // cannot be assembled as prefix + link + "and" + link in every language.
    // This is why the footer is five fields rather than three.
    termsSuffix: L('', '', ' của chúng tôi'),
  };
}

/**
 * "Incorrect email or password…" — the most-read error on this screen.
 *
 * Takes the localized "Forgot password?" label rather than hardcoding it,
 * because the sentence QUOTES the link the parent is being told to tap. If
 * the two drift, the copy points at a control that does not exist by that
 * name — pinned by `welcomeCopy.test.ts`.
 */
export function badCredentials(forgotLabel: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `Incorrect email or password. Double-check both, or tap "${forgotLabel}" below.`,
    `Correo o contraseña incorrectos. Revise ambos, o toque "${forgotLabel}" abajo.`,
    `Email hoặc mật khẩu không đúng. Hãy kiểm tra lại cả hai, hoặc chạm "${forgotLabel}" bên dưới.`,
  );
}

/** "Enter your email above first…" — same quoting rule as `badCredentials`. */
export function emailNeededForReset(forgotLabel: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `Enter your email above first, then tap "${forgotLabel}" again.`,
    `Escriba primero su correo arriba y luego toque "${forgotLabel}" de nuevo.`,
    `Trước tiên hãy nhập email của quý vị ở trên, rồi chạm "${forgotLabel}" lần nữa.`,
  );
}

/** Sign-up succeeded and a confirmation link is waiting in their inbox. */
export function confirmationSent(address: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `Almost there! We sent a confirmation link to ${address}. Open it to activate your account, then come back and sign in.`,
    `¡Ya casi! Enviamos un enlace de confirmación a ${address}. Ábralo para activar su cuenta y luego vuelva e inicie sesión.`,
    `Sắp xong! Chúng tôi đã gửi liên kết xác nhận đến ${address}. Hãy mở liên kết để kích hoạt tài khoản, rồi quay lại và đăng nhập.`,
  );
}

/** A password-reset link is on its way. */
export function resetSent(address: string, locale: FunnelLocale = 'en'): string {
  return pick(
    locale,
    `Password reset link sent to ${address}. Open the email and follow the link to choose a new password.`,
    `Enviamos un enlace para restablecer la contraseña a ${address}. Abra el correo y siga el enlace para elegir una contraseña nueva.`,
    `Đã gửi liên kết đặt lại mật khẩu đến ${address}. Hãy mở email và làm theo liên kết để chọn mật khẩu mới.`,
  );
}

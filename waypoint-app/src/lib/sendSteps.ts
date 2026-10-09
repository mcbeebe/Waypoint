/**
 * "When you press Send" — the plain-language steps shown above the Gmail
 * send button on the Letters screen (owner ask, 2026-10-09).
 *
 * The button sits beside "Open in Mail app", which only opens a compose
 * window; this one sends by itself through the parent's Gmail. The note says
 * exactly what follows, built from THIS letter: who it is from and to, that a
 * copy lands in the paper trail, whether a legal clock starts, and that a
 * reply shows on Home. A step is only claimed when it is true for this send.
 *
 * Pure: LettersScreen passes what it knows; nothing here reads state.
 */
import type { FunnelLocale } from '@/lib/eligibility';

export interface SendStepsInput {
  locale: FunnelLocale;
  /** The connected Gmail address, when known. */
  from: string | null;
  /** The recipient as shown on the To line ("Lilia Talavera"). */
  toName: string;
  /**
   * What tracking this send starts:
   * - 'clock': a new tracked request with a legal deadline of `clockDays`
   * - 'tracked': a new tracked request, no statutory deadline
   * - 'case': the letter belongs to a request already being tracked
   * - 'none': saved to the paper trail only
   */
  tracking: 'clock' | 'tracked' | 'case' | 'none';
  clockDays?: number | null;
}

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) => (locale === 'es' ? es : locale === 'vi' ? vi : en);
}

/** The heading and 3–4 steps, in the order they happen. */
export function sendSteps(input: SendStepsInput): { title: string; steps: string[] } {
  const L = picker(input.locale);
  const from = input.from ?? L('your Gmail', 'su Gmail', 'Gmail của quý vị');
  const to = input.toName;

  const steps = [
    L(
      'You’ll see the whole email one last time — nothing goes until you confirm.',
      'Verá el correo completo una última vez — no se envía nada hasta que usted lo confirme.',
      'Quý vị sẽ xem lại toàn bộ email lần cuối — không có gì được gửi cho đến khi quý vị xác nhận.'
    ),
    L(
      `It’s sent from ${from} to ${to}, and shows up in your Gmail Sent folder.`,
      `Se envía desde ${from} a ${to}, y aparece en la carpeta Enviados de su Gmail.`,
      `Email được gửi từ ${from} đến ${to}, và sẽ có trong thư mục Đã gửi của Gmail.`
    ),
  ];

  const days = input.clockDays ?? null;
  if (input.tracking === 'clock' && days) {
    steps.push(
      L(
        `A copy is saved to your Paper Trail, and Waypoint starts tracking the ${days}-day deadline for an answer.`,
        `Se guarda una copia en su registro de comunicaciones, y Waypoint empieza a seguir el plazo de ${days} días para recibir respuesta.`,
        `Một bản sao được lưu vào nhật ký liên lạc, và Waypoint bắt đầu theo dõi thời hạn ${days} ngày để được trả lời.`
      )
    );
  } else if (input.tracking === 'tracked' || (input.tracking === 'clock' && !days)) {
    steps.push(
      L(
        'A copy is saved to your Paper Trail, and Waypoint starts tracking the request.',
        'Se guarda una copia en su registro de comunicaciones, y Waypoint empieza a seguir la solicitud.',
        'Một bản sao được lưu vào nhật ký liên lạc, và Waypoint bắt đầu theo dõi yêu cầu này.'
      )
    );
  } else if (input.tracking === 'case') {
    steps.push(
      L(
        'A copy is saved to your Paper Trail and added to this request’s case file.',
        'Se guarda una copia en su registro de comunicaciones y en el expediente de esta solicitud.',
        'Một bản sao được lưu vào nhật ký liên lạc và hồ sơ của yêu cầu này.'
      )
    );
  } else {
    steps.push(
      L(
        'A copy is saved to your Paper Trail.',
        'Se guarda una copia en su registro de comunicaciones.',
        'Một bản sao được lưu vào nhật ký liên lạc.'
      )
    );
  }

  steps.push(
    L(
      'When a reply comes in on this email, it shows on Home.',
      'Cuando llegue una respuesta a este correo, aparecerá en Inicio.',
      'Khi có thư trả lời cho email này, thư sẽ hiện trên Trang chủ.'
    )
  );

  return {
    title: L('When you press Send', 'Al tocar Enviar', 'Khi quý vị bấm Gửi').toUpperCase(),
    steps,
  };
}

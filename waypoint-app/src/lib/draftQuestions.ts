/**
 * The draft flow's questions (Roadmap/Draft-Flow-Plan.md phase 9a) — the only
 * genuinely new logic in the flow. When a parent taps "Draft the follow-up" on
 * the One Thing card, this decides the two or three questions that sharpen the
 * letter, and turns their tapped answers into the request the AI fills in.
 *
 * Pure — no react-native, no supabase — so the questions and the request they
 * build are unit-testable and the sheet stays dumb.
 *
 * The five rules this module is built to keep (and its tests pin):
 *  1. Never more than three. A question the family profile already answers is
 *     asserted on the draft, not asked here.
 *  2. Chips, not prose. Every question is answerable by tapping; the freeform
 *     box is an escape hatch, never the primary path.
 *  3. Every answer changes the letter. `answersToRequest` returns different
 *     text for different answers — a question that changed nothing would be
 *     decoration, and that is a test.
 *  4. Collaborative-first. Option copy asks, never demands; the tone default
 *     follows the STAGE (a running clock → warm, a passed deadline → firmer),
 *     and the parent can override in one tap.
 *  5. Trilingual, with a locale-parity test: same ids and options in en/es/vi,
 *     only the prose differs. The request string that feeds the AI stays
 *     English, like citations — it is model input, not something a parent reads.
 */
import type { FunnelLocale } from '@/lib/eligibility';
import type { DraftTone } from '@/lib/lettersCatalog';
import type { TriageClass, TriageItem } from '@/lib/homeTriage';
import type { LetterProfile } from '@/lib/draftBlanks';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export interface DraftQuestionOption {
  /** Stable key — the request builder and the tone selector switch on this. */
  value: string;
  label: string;
  /** Present only on the tone question: the DraftTone this option selects. */
  tone?: DraftTone;
}

export interface DraftQuestion {
  id: string;
  prompt: string;
  /** One line under the prompt; never required reading. */
  help?: string;
  options: DraftQuestionOption[];
  /** The option pre-selected by stage (rule 4). Always one of `options`. */
  suggested: string;
  /** Optional free-text escape hatch. Never the primary path (rule 2). */
  freeform?: { label: string; placeholder: string };
  /** True when the whole question may be skipped. */
  optional?: boolean;
}

/** The classes whose card CTA becomes "draft a letter"; others get no flow. */
const DRAFTABLE: ReadonlySet<TriageClass> = new Set(['overdue', 'clock', 'reply']);

export function isDraftable(cls: TriageClass): boolean {
  return DRAFTABLE.has(cls);
}

/**
 * The tone Waypoint suggests, by stage — collaborative-first. A clock still
 * running gets a warm nudge; a passed deadline gets a firmer, organized letter;
 * a reply is answered clearly. The parent can always pick another (rule 4).
 */
export function suggestedTone(cls: TriageClass): DraftTone {
  if (cls === 'overdue') return 'professional';
  if (cls === 'reply') return 'professional';
  return 'warm'; // clock, and any other draftable class
}

function toneQuestion(cls: TriageClass, locale: FunnelLocale): DraftQuestion {
  const L = picker(locale);
  return {
    id: 'tone',
    prompt: L('How do you want to sound?', '¿Cómo quiere sonar?', 'Quý vị muốn giọng điệu thế nào?'),
    help: L(
      "You know them, we don't — change this freely.",
      'Usted los conoce, nosotros no — cámbielo libremente.',
      'Quý vị hiểu họ, chúng tôi thì không — hãy đổi tùy ý.'
    ),
    suggested: suggestedTone(cls),
    options: [
      {
        value: 'warm',
        tone: 'warm',
        label: L('Friendly — a gentle nudge', 'Amable — un recordatorio suave', 'Thân thiện — nhắc nhẹ'),
      },
      {
        value: 'professional',
        tone: 'professional',
        label: L(
          "Firmer — it's been a while",
          'Más firme — ya pasó tiempo',
          'Cứng rắn hơn — đã khá lâu'
        ),
      },
      {
        value: 'strong',
        tone: 'strong',
        label: L(
          'Formal — I want this on the record',
          'Formal — quiero que conste',
          'Trang trọng — tôi muốn ghi nhận chính thức'
        ),
      },
    ],
  };
}

function noteQuestion(locale: FunnelLocale, profile: LetterProfile): DraftQuestion {
  const L = picker(locale);
  const child = profile.childFirstName?.trim();
  // A real use of the profile: seed the example with the child's name when we
  // know it, so the box shows the parent what "in your own words" looks like.
  const placeholder = child
    ? L(
        `e.g. "${child}'s aide left in June and it's been hard since"`,
        `p. ej. "el asistente de ${child} se fue en junio y ha sido difícil"`,
        `vd. "trợ lý của ${child} nghỉ hồi tháng 6 và từ đó rất khó khăn"`
      )
    : L(
        'e.g. "the aide left in June and it\'s been hard since"',
        'p. ej. "el asistente se fue en junio y ha sido difícil"',
        'vd. "trợ lý nghỉ hồi tháng 6 và từ đó rất khó khăn"'
      );
  return {
    id: 'note',
    optional: true,
    prompt: L(
      'Anything you want them to know?',
      '¿Algo que quiera que sepan?',
      'Quý vị muốn họ biết điều gì không?'
    ),
    help: L(
      "Skip this and the letter is still complete. We'll put it in properly.",
      'Puede omitirlo y la carta queda completa. Lo redactaremos bien.',
      'Có thể bỏ qua, thư vẫn hoàn chỉnh. Chúng tôi sẽ diễn đạt đúng cách.'
    ),
    suggested: '',
    options: [],
    freeform: {
      label: L('In your own words', 'En sus propias palabras', 'Bằng lời của quý vị'),
      placeholder,
    },
  };
}

/** "What have you heard back?" — for a follow-up on a request (overdue/clock). */
function heardBackQuestion(locale: FunnelLocale): DraftQuestion {
  const L = picker(locale);
  return {
    id: 'heard_back',
    prompt: L(
      'What have you heard back so far?',
      '¿Qué le han respondido hasta ahora?',
      'Quý vị đã nhận được phản hồi gì?'
    ),
    help: L(
      'This changes what the letter says. One tap.',
      'Esto cambia lo que dice la carta. Un toque.',
      'Điều này thay đổi nội dung thư. Một chạm.'
    ),
    suggested: 'nothing',
    options: [
      {
        value: 'nothing',
        label: L('Nothing at all', 'Nada', 'Chưa có gì'),
      },
      {
        value: 'said_theyd',
        label: L(
          "They said they'd get back to me",
          'Dijeron que me responderían',
          'Họ nói sẽ trả lời tôi'
        ),
      },
      {
        value: 'asked_for_something',
        label: L(
          'They asked me for something',
          'Me pidieron algo',
          'Họ yêu cầu tôi điều gì đó'
        ),
      },
      {
        value: 'said_no',
        label: L('They said no', 'Dijeron que no', 'Họ từ chối'),
      },
    ],
  };
}

/** "What did they say?" — for answering a reply that arrived. */
function replyReadQuestion(locale: FunnelLocale): DraftQuestion {
  const L = picker(locale);
  return {
    id: 'reply_read',
    prompt: L('What did they say?', '¿Qué dijeron?', 'Họ đã nói gì?'),
    help: L(
      'Confirm and we write the right answer — each goes to a different letter.',
      'Confirme y escribimos la respuesta correcta — cada una va a una carta distinta.',
      'Xác nhận và chúng tôi viết câu trả lời đúng — mỗi lựa chọn dẫn tới một thư khác nhau.'
    ),
    suggested: 'unclear',
    options: [
      {
        value: 'agreed',
        label: L("They agreed — it's handled", 'Aceptaron — está resuelto', 'Họ đồng ý — đã xong'),
      },
      {
        value: 'need_more',
        label: L(
          'They need something more from me',
          'Necesitan algo más de mí',
          'Họ cần thêm điều gì đó từ tôi'
        ),
      },
      {
        value: 'said_no',
        label: L('They said no', 'Dijeron que no', 'Họ từ chối'),
      },
      {
        value: 'unclear',
        label: L("It's unclear", 'No está claro', 'Không rõ ràng'),
      },
    ],
  };
}

/**
 * The 0–3 questions for this card's draft flow. Returns [] for a class whose
 * CTA is not "draft a letter". `profile` lets a question the family record
 * already answers be skipped (rule 1); today only the note's example uses it,
 * but the contract keeps the door open.
 */
export function questionsFor(
  item: TriageItem,
  profile: LetterProfile,
  locale: FunnelLocale
): DraftQuestion[] {
  if (!isDraftable(item.cls)) return [];
  const first = item.cls === 'reply' ? replyReadQuestion(locale) : heardBackQuestion(locale);
  // Exactly three, never more (rule 1): what happened, how to sound, one note.
  return [first, toneQuestion(item.cls, locale), noteQuestion(locale, profile)];
}

/** The DraftTone the parent chose, or the stage default if they didn't touch it. */
export function toneFromAnswers(
  item: TriageItem,
  answers: Record<string, string>
): DraftTone {
  const chosen = answers.tone;
  if (chosen === 'warm' || chosen === 'professional' || chosen === 'strong') return chosen;
  return suggestedTone(item.cls);
}

/** The first-answer key → the sentence it becomes in the request to the AI. */
const HEARD_BACK_SENTENCE: Record<string, string> = {
  nothing: "I haven't heard anything back yet.",
  said_theyd: "They told me they would get back to me, but I still haven't heard.",
  asked_for_something:
    'They asked me for something in response, and I want to follow up on it.',
  said_no:
    'I was told no. I would like the decision in writing so I understand my options.',
};

const REPLY_READ_SENTENCE: Record<string, string> = {
  agreed: "They agreed, and I'd like to confirm the details in writing.",
  need_more: 'They need something more from me, and I want to respond.',
  said_no:
    'They said no. I am requesting the decision in writing, including my appeal rights.',
  unclear: "Their answer wasn't clear, and I want to ask for the specifics in writing.",
};

/**
 * Turn the tapped answers into the parent's request "in their own words" — the
 * `question` string generateLetter fills in. English on purpose (model input,
 * like citations); the draft itself is written in the family's language via the
 * generateLetter `language` param. The tone answer is NOT included here; it
 * rides the separate tone field (see `toneFromAnswers`).
 *
 * Rule 3 lives here: two different answer sets must produce two different
 * strings, or a question was decoration.
 */
export function answersToRequest(
  questions: DraftQuestion[],
  answers: Record<string, string>
): string {
  const parts: string[] = [];
  for (const q of questions) {
    if (q.id === 'tone') continue;
    // Fall back to the question's own suggested value, symmetric with
    // toneFromAnswers: a parent who accepts the pre-selected chips and submits
    // must still produce a real request, never an empty one sent to the AI.
    const value = answers[q.id] ?? q.suggested;
    if (!value) continue;
    if (q.id === 'heard_back') {
      const s = HEARD_BACK_SENTENCE[value];
      if (s) parts.push(s);
    } else if (q.id === 'reply_read') {
      const s = REPLY_READ_SENTENCE[value];
      if (s) parts.push(s);
    } else if (q.freeform) {
      // A freeform note is the parent's own words — carried verbatim, trimmed.
      const note = value.trim();
      if (note) parts.push(note);
    }
  }
  return parts.join(' ');
}

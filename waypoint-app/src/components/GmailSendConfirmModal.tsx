/**
 * The last look before a letter leaves through the parent's own Gmail.
 *
 * "Send now with Gmail" used to fire on one tap. It sits beside "Open in
 * Gmail", which only opens a compose window, so nothing told the parent this
 * one does not wait. The owner sent a letter that way (2026-10-07) with a subject
 * line that had nothing to do with it — a subject they were never shown and
 * could not change. So the button now opens this sheet. It shows exactly what
 * will go out — from, to, cc, subject, body — and lets the parent fix the subject
 * before anything is sent.
 *
 * Presentational and controlled: LettersScreen owns the subject and the send,
 * so an edit here is the same edit as on the draft screen and closing the
 * sheet loses nothing.
 */
import React from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { FunnelLocale } from '@/lib/eligibility';
import { brand, colors, fonts, spacing, radii, semantic } from '@/lib/theme';

export interface GmailSendConfirmModalProps {
  visible: boolean;
  locale: FunnelLocale;
  /** The connected Gmail address, when the status call returned it. */
  fromEmail: string | null;
  /** Who the letter is addressed to — chosen on the draft screen. */
  primary: { name: string; email: string };
  /** Copied recipients — chosen on the draft screen; shown here so the last look is complete. */
  cc?: { name: string; email: string }[];
  subject: string;
  onChangeSubject: (next: string) => void;
  /** The exact body that will be sent. */
  body: string;
  /**
   * This exact letter already went out. Sending again is allowed — to a new
   * recipient, say — but it is a second email, and the sheet says so.
   */
  alreadySent: boolean;
  sending: boolean;
  /** Why Send now is off (blanks left in the letter), if it is. */
  blockedReason: string | null;
  /** A failed send comes back here, so the parent is told why. */
  problem: string | null;
  /**
   * Asked when the letter is addressed outside the system its template is
   * written to (letterSystems.ts): is this really that request? Send now
   * stays off until it is answered — after the send would be too late, and
   * an unanswered question must never quietly decide a legal deadline.
   */
  clockQuestion?: { question: string; explain: string; yes: string; no: string } | null;
  clockAnswer?: 'yes' | 'no' | null;
  onClockAnswer?: (answer: 'yes' | 'no') => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const COPY: Record<
  FunnelLocale,
  {
    title: string;
    warning: string;
    from: string;
    yourGmail: string;
    to: string;
    cc: string;
    subject: string;
    subjectA11y: string;
    message: string;
    resend: string;
    needSubject: string;
    needClockAnswer: string;
    back: string;
    send: string;
  }
> = {
  en: {
    title: 'Send this email now?',
    warning: 'This goes out right away from your Gmail — there’s no undo. Check who it’s going to and the subject.',
    from: 'From',
    yourGmail: 'your Gmail',
    to: 'To',
    cc: 'Cc',
    subject: 'Subject',
    subjectA11y: 'Subject of the email you are about to send',
    message: 'Message',
    resend: 'You already sent this letter. Sending it again sends a second email.',
    needSubject: 'Add a subject first.',
    needClockAnswer: 'Answer the question about the request first.',
    back: 'Go back',
    send: 'Send now',
  },
  es: {
    title: '¿Enviar este correo ahora?',
    warning: 'Se envía de inmediato desde su Gmail — no se puede deshacer. Revise a quién va y el asunto.',
    from: 'De',
    yourGmail: 'su Gmail',
    to: 'Para',
    cc: 'Cc',
    subject: 'Asunto',
    subjectA11y: 'Asunto del correo que está por enviar',
    message: 'Mensaje',
    resend: 'Ya envió esta carta. Si la envía de nuevo, saldrá un segundo correo.',
    needSubject: 'Primero escriba un asunto.',
    needClockAnswer: 'Primero responda la pregunta sobre la solicitud.',
    back: 'Volver',
    send: 'Enviar ahora',
  },
  vi: {
    title: 'Gửi email này ngay bây giờ?',
    warning: 'Thư sẽ được gửi ngay từ Gmail của quý vị — không thể hoàn tác. Hãy kiểm tra người nhận và tiêu đề.',
    from: 'Từ',
    yourGmail: 'Gmail của quý vị',
    to: 'Đến',
    cc: 'Đồng gửi',
    subject: 'Tiêu đề',
    subjectA11y: 'Tiêu đề của email quý vị sắp gửi',
    message: 'Nội dung',
    resend: 'Quý vị đã gửi thư này. Gửi lại sẽ gửi thêm một email nữa.',
    needSubject: 'Hãy nhập tiêu đề trước.',
    needClockAnswer: 'Hãy trả lời câu hỏi về yêu cầu trước.',
    back: 'Quay lại',
    send: 'Gửi ngay',
  },
};

/** The confirm-before-send sheet for a direct Gmail send. */
export default function GmailSendConfirmModal({
  visible,
  locale,
  fromEmail,
  primary,
  cc = [],
  subject,
  onChangeSubject,
  body,
  alreadySent,
  sending,
  blockedReason,
  problem,
  clockQuestion = null,
  clockAnswer = null,
  onClockAnswer,
  onCancel,
  onConfirm,
}: GmailSendConfirmModalProps) {
  const copy = COPY[locale];
  const needsSubject = !subject.trim();
  const needsClockAnswer = !!clockQuestion && !clockAnswer;
  const blocked = sending || needsSubject || !!blockedReason || needsClockAnswer;
  const addressee =
    primary.name && primary.name !== primary.email
      ? `${primary.name} <${primary.email}>`
      : primary.email;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      // Escape / Android back must not close the sheet mid-send: the outcome
      // (or the reason it failed) is reported here.
      onRequestClose={sending ? () => undefined : onCancel}
      // On web these props land on the role="dialog" element, which
      // otherwise has no accessible name.
      accessibilityLabel={copy.title}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {copy.title}
          </Text>
          <View style={styles.warning}>
            <Text style={styles.warningText}>{copy.warning}</Text>
          </View>

          <ScrollView style={styles.fields} contentContainerStyle={styles.fieldsInner}>
            <View style={styles.line}>
              <Text style={styles.lineLabel}>{copy.from}</Text>
              <Text style={[styles.lineBody, styles.fromText]}>{fromEmail ?? copy.yourGmail}</Text>
            </View>

            <View style={styles.line}>
              <Text style={styles.lineLabel}>{copy.to}</Text>
              <View style={[styles.lineBody, styles.chips]}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{addressee}</Text>
                </View>
              </View>
            </View>

            {cc.length > 0 && (
              <View style={styles.line}>
                <Text style={styles.lineLabel}>{copy.cc}</Text>
                <View style={[styles.lineBody, styles.chips]}>
                  {cc.map((p) => (
                    <View key={p.email} style={styles.chip}>
                      <Text style={styles.chipText}>
                        {p.name && p.name !== p.email ? `${p.name} <${p.email}>` : p.email}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.line}>
              <Text style={styles.lineLabel}>{copy.subject}</Text>
              <TextInput
                style={[styles.lineBody, styles.subjectInput]}
                value={subject}
                onChangeText={onChangeSubject}
                editable={!sending}
                // The gmail function refuses a longer subject (mime.ts MAX_SUBJECT_CHARS).
                maxLength={250}
                accessibilityLabel={copy.subjectA11y}
              />
            </View>

            {clockQuestion ? (
              <View style={styles.clockBox} accessibilityRole="radiogroup" accessibilityLabel={clockQuestion.question}>
                <Text style={styles.clockQuestion}>{clockQuestion.question}</Text>
                <Text style={styles.clockExplain}>{clockQuestion.explain}</Text>
                {(['yes', 'no'] as const).map((answer) => (
                  <TouchableOpacity
                    key={answer}
                    style={[styles.clockOption, clockAnswer === answer && styles.clockOptionOn]}
                    onPress={() => onClockAnswer?.(answer)}
                    disabled={sending}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: clockAnswer === answer, disabled: sending }}
                    // react-native-web reads aria-checked, not accessibilityState.checked.
                    aria-checked={clockAnswer === answer}
                    accessibilityLabel={clockQuestion[answer]}
                  >
                    <Text style={[styles.clockOptionText, clockAnswer === answer && styles.clockOptionTextOn]}>
                      {clockAnswer === answer ? '●' : '○'} {clockQuestion[answer]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={styles.messageLabel}>{copy.message}</Text>
            <ScrollView style={styles.preview} contentContainerStyle={styles.previewInner}>
              <Text style={styles.previewText}>{body}</Text>
            </ScrollView>

          </ScrollView>

          {/* Announced as they appear: a screen-reader user who taps Send now
              and hears nothing has no way to know why it didn't go. */}
          <View accessibilityLiveRegion="polite">
            {alreadySent ? <Text style={styles.resend}>{copy.resend}</Text> : null}
            {needsSubject ? <Text style={styles.problem}>{copy.needSubject}</Text> : null}
            {needsClockAnswer ? <Text style={styles.problem}>{copy.needClockAnswer}</Text> : null}
            {blockedReason ? <Text style={styles.problem}>{blockedReason}</Text> : null}
            {problem ? <Text style={styles.problem}>{problem}</Text> : null}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.backButton, sending && styles.busy]}
              onPress={onCancel}
              disabled={sending}
              accessibilityRole="button"
              accessibilityState={{ disabled: sending }}
              accessibilityLabel={copy.back}
            >
              <Text style={styles.backText}>{copy.back}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, blocked && styles.sendButtonOff]}
              onPress={onConfirm}
              disabled={blocked}
              accessibilityRole="button"
              accessibilityState={{ disabled: blocked }}
              accessibilityLabel={copy.send}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.sendText}>{copy.send}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: brand.panel,
    borderRadius: radii.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
  },
  title: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
    marginBottom: spacing.sm,
  },
  warning: {
    backgroundColor: semantic.warningBg,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: { fontSize: fonts.sizes.sm, color: semantic.warning, lineHeight: 18 },
  fields: { flexGrow: 0 },
  fieldsInner: { gap: spacing.sm, paddingBottom: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  lineLabel: {
    width: 64,
    paddingTop: 7,
    fontSize: fonts.sizes.sm,
    color: brand.inkFaint,
    fontWeight: fonts.weights.semibold as '600',
  },
  lineBody: { flex: 1, gap: 6 },
  fromText: { paddingTop: 7, fontSize: fonts.sizes.sm, color: brand.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.pineTint,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 30,
  },
  chipText: { fontSize: fonts.sizes.sm, color: brand.ink },
  subjectInput: {
    backgroundColor: brand.paper,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minHeight: 36,
    fontSize: fonts.sizes.sm,
    color: brand.ink,
  },
  messageLabel: {
    fontSize: fonts.sizes.sm,
    color: brand.inkFaint,
    fontWeight: fonts.weights.semibold as '600',
    marginTop: spacing.xs,
  },
  preview: { backgroundColor: brand.paper, borderRadius: radii.md, maxHeight: 220 },
  previewInner: { padding: spacing.md },
  previewText: { fontSize: fonts.sizes.sm, color: brand.ink, lineHeight: 19 },
  clockBox: {
    backgroundColor: semantic.warningBg,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  clockQuestion: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
  },
  clockExplain: { fontSize: fonts.sizes.xs, color: brand.inkSoft, lineHeight: 17 },
  clockOption: {
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.panel,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  clockOptionOn: { borderColor: brand.pine, backgroundColor: brand.pineTint },
  clockOptionText: { fontSize: fonts.sizes.sm, color: brand.ink },
  clockOptionTextOn: { fontWeight: fonts.weights.semibold as '600' },
  resend: {
    fontSize: fonts.sizes.xs,
    color: semantic.warning,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  problem: {
    fontSize: fonts.sizes.xs,
    color: brand.urgent,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: { fontSize: fonts.sizes.sm, color: brand.inkSoft },
  busy: { opacity: 0.5 },
  sendButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderRadius: radii.md,
    backgroundColor: brand.pine,
    minHeight: 44,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonOff: { opacity: 0.5 },
  sendText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.bold as '700',
  },
});

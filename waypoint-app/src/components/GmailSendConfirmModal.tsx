/**
 * The last look before a letter leaves through the parent's own Gmail.
 *
 * "Send now with Gmail" used to fire on one tap. It sits beside "Open in
 * Gmail", which only opens a compose window, so nothing told the parent this
 * one does not wait. The owner sent a letter that way (2026-10-07) with a subject
 * line that had nothing to do with it — a subject they were never shown and
 * could not change. So the button now opens this sheet. It shows exactly what
 * will go out — from, to, subject, body — and lets the parent fix the subject
 * or copy someone in before anything is sent.
 *
 * Presentational and controlled: LettersScreen owns the subject, the
 * recipient list and the send, so an edit here is the same edit as on the
 * draft screen and closing the sheet loses nothing.
 */
import React, { useMemo, useState } from 'react';
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
import { addRecipient, isEmailAddress } from '@/lib/letterAddress';
import type { FunnelLocale } from '@/lib/eligibility';
import { brand, colors, fonts, spacing, radii, semantic } from '@/lib/theme';

export interface ConfirmContact {
  id: string;
  name: string;
  email: string | null;
  role?: string | null;
}

export interface GmailSendConfirmModalProps {
  visible: boolean;
  locale: FunnelLocale;
  /** The connected Gmail address, when the status call returned it. */
  fromEmail: string | null;
  /** Who the letter is addressed to — chosen on the draft screen. */
  primary: { name: string; email: string };
  /** Anyone else on the To line. */
  extraTo: string[];
  onChangeExtraTo: (next: string[]) => void;
  subject: string;
  onChangeSubject: (next: string) => void;
  /** The exact body that will be sent. */
  body: string;
  /** Key Contacts, offered as the parent types. */
  contacts: ConfirmContact[];
  sending: boolean;
  /** Why Send now is off (blanks left in the letter), if it is. */
  blockedReason: string | null;
  /** A failed send comes back here, so the parent is told why. */
  problem: string | null;
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
    subject: string;
    subjectA11y: string;
    message: string;
    addPlaceholder: string;
    add: string;
    invalid: string;
    duplicate: string;
    full: string;
    needSubject: string;
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
    subject: 'Subject',
    subjectA11y: 'Subject of the email you are about to send',
    message: 'Message',
    addPlaceholder: 'Add another email, or type a contact’s name',
    add: 'Add',
    invalid: 'That doesn’t look like one email address.',
    duplicate: 'They’re already on this email.',
    full: 'That’s as many people as one letter can go to.',
    needSubject: 'Add a subject first.',
    back: 'Go back',
    send: 'Send now',
  },
  es: {
    title: '¿Enviar este correo ahora?',
    warning: 'Se envía de inmediato desde su Gmail — no se puede deshacer. Revise a quién va y el asunto.',
    from: 'De',
    yourGmail: 'su Gmail',
    to: 'Para',
    subject: 'Asunto',
    subjectA11y: 'Asunto del correo que está por enviar',
    message: 'Mensaje',
    addPlaceholder: 'Agregue otro correo o escriba el nombre de un contacto',
    add: 'Agregar',
    invalid: 'Eso no parece una sola dirección de correo.',
    duplicate: 'Esa persona ya está en este correo.',
    full: 'Esa es la cantidad máxima de personas para una carta.',
    needSubject: 'Primero escriba un asunto.',
    back: 'Volver',
    send: 'Enviar ahora',
  },
  vi: {
    title: 'Gửi email này ngay bây giờ?',
    warning: 'Thư sẽ được gửi ngay từ Gmail của quý vị — không thể hoàn tác. Hãy kiểm tra người nhận và tiêu đề.',
    from: 'Từ',
    yourGmail: 'Gmail của quý vị',
    to: 'Đến',
    subject: 'Tiêu đề',
    subjectA11y: 'Tiêu đề của email quý vị sắp gửi',
    message: 'Nội dung',
    addPlaceholder: 'Thêm email khác, hoặc nhập tên một liên hệ',
    add: 'Thêm',
    invalid: 'Đó không giống một địa chỉ email.',
    duplicate: 'Người này đã có trong email.',
    full: 'Một thư chỉ gửi được tới số người này.',
    needSubject: 'Hãy nhập tiêu đề trước.',
    back: 'Quay lại',
    send: 'Gửi ngay',
  },
};

type LineCopy = (typeof COPY)['en'];

/**
 * One address line: the people on it, a way to remove the ones the parent
 * added, and an input that takes a typed address or a Key Contact's name.
 */
function RecipientLine({
  label,
  fixed,
  list,
  onChange,
  exclude,
  contacts,
  copy,
  disabled,
}: {
  label: string;
  /** Shown first and not removable here (the addressee). */
  fixed?: string;
  list: string[];
  onChange: (next: string[]) => void;
  /** Everyone already on the letter outside this line. */
  exclude: string[];
  contacts: ConfirmContact[];
  copy: LineCopy;
  disabled: boolean;
}) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onLetter = useMemo(
    () => new Set([...list, ...exclude].map((e) => e.toLowerCase())),
    [list, exclude]
  );
  const query = input.trim().toLowerCase();
  // Suggestions only once the parent types — a row of every contact under
  // every line would bury the letter this sheet exists to show.
  const suggestions = query
    ? contacts
        .filter(
          (c) =>
            !!c.email &&
            !onLetter.has(c.email.toLowerCase()) &&
            (c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query))
        )
        .slice(0, 4)
    : [];

  const add = (value: string) => {
    const result = addRecipient(list, value, exclude);
    if (!result.added) {
      setError(copy[result.reason]);
      return;
    }
    onChange(result.list);
    setInput('');
    setError(null);
  };

  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <View style={styles.lineBody}>
        <View style={styles.chips}>
          {fixed ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{fixed}</Text>
            </View>
          ) : null}
          {list.map((email) => (
            <View key={email} style={styles.chip}>
              <Text style={styles.chipText}>{email}</Text>
              <TouchableOpacity
                onPress={() => onChange(list.filter((e) => e !== email))}
                disabled={disabled}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${email}`}
              >
                <Text style={styles.chipRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={input}
            onChangeText={(v) => {
              setInput(v);
              setError(null);
            }}
            onSubmitEditing={() => add(input)}
            placeholder={copy.addPlaceholder}
            placeholderTextColor={brand.inkFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
            accessibilityLabel={`Add someone to the ${label} line`}
          />
          <TouchableOpacity
            style={[styles.addButton, !isEmailAddress(input) && styles.addButtonOff]}
            onPress={() => add(input)}
            disabled={disabled || !isEmailAddress(input)}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || !isEmailAddress(input) }}
            accessibilityLabel={`${copy.add} to ${label}`}
          >
            <Text style={styles.addButtonText}>{copy.add}</Text>
          </TouchableOpacity>
        </View>
        {suggestions.length > 0 && (
          <View style={styles.chips}>
            {suggestions.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.suggestion}
                onPress={() => add(c.email!)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Add ${c.name} to the ${label} line`}
              >
                <Text style={styles.suggestionText}>
                  + {c.name}
                  {c.role ? ` · ${c.role}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {error ? <Text style={styles.lineError}>{error}</Text> : null}
      </View>
    </View>
  );
}

/** The confirm-before-send sheet for a direct Gmail send. */
export default function GmailSendConfirmModal({
  visible,
  locale,
  fromEmail,
  primary,
  extraTo,
  onChangeExtraTo,
  subject,
  onChangeSubject,
  body,
  contacts,
  sending,
  blockedReason,
  problem,
  onCancel,
  onConfirm,
}: GmailSendConfirmModalProps) {
  const copy = COPY[locale];
  const needsSubject = !subject.trim();
  const blocked = sending || needsSubject || !!blockedReason;
  const addressee =
    primary.name && primary.name !== primary.email
      ? `${primary.name} <${primary.email}>`
      : primary.email;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet} accessibilityViewIsModal accessibilityLabel={copy.title}>
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

            <RecipientLine
              label={copy.to}
              fixed={addressee}
              list={extraTo}
              onChange={onChangeExtraTo}
              exclude={[primary.email]}
              contacts={contacts}
              copy={copy}
              disabled={sending}
            />

            <View style={styles.line}>
              <Text style={styles.lineLabel}>{copy.subject}</Text>
              <TextInput
                style={[styles.lineBody, styles.subjectInput]}
                value={subject}
                onChangeText={onChangeSubject}
                editable={!sending}
                accessibilityLabel={copy.subjectA11y}
              />
            </View>

            <Text style={styles.messageLabel}>{copy.message}</Text>
            <ScrollView style={styles.preview} contentContainerStyle={styles.previewInner}>
              <Text style={styles.previewText}>{body}</Text>
            </ScrollView>
          </ScrollView>

          {needsSubject ? <Text style={styles.problem}>{copy.needSubject}</Text> : null}
          {blockedReason ? <Text style={styles.problem}>{blockedReason}</Text> : null}
          {problem ? <Text style={styles.problem}>{problem}</Text> : null}

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
    gap: 6,
    backgroundColor: brand.pineTint,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 30,
  },
  chipText: { fontSize: fonts.sizes.sm, color: brand.ink },
  chipRemove: { fontSize: fonts.sizes.base, color: brand.inkSoft, lineHeight: 16 },
  addRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addInput: {
    flex: 1,
    backgroundColor: brand.paper,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minHeight: 36,
    fontSize: fonts.sizes.sm,
    color: brand.ink,
  },
  addButton: {
    backgroundColor: brand.pine,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  addButtonOff: { opacity: 0.4 },
  addButtonText: {
    color: colors.white,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
  },
  suggestion: {
    backgroundColor: brand.paper,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 30,
    justifyContent: 'center',
  },
  suggestionText: { fontSize: fonts.sizes.sm, color: brand.pine },
  lineError: { fontSize: fonts.sizes.xs, color: brand.urgent },
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

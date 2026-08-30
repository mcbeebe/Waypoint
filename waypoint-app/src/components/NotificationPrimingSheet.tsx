/**
 * NotificationPrimingSheet — the contextual, in-app permission ask (phase 7,
 * initiative 003). Shown ONCE, over Home, when a family first has a live clock,
 * so the OS prompt arrives with a reason a parent already said yes to. Never a
 * cold launch prompt. Declining is remembered; the only re-entry is Settings.
 *
 * All copy is trilingual and tone-correct — it frames the value as "so you
 * don't have to keep checking," never as chasing an agency.
 */
import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { FunnelLocale } from '@/lib/eligibility';
import { colors, fonts, spacing, radii } from '@/lib/theme';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';

interface Props {
  visible: boolean;
  locale: FunnelLocale;
  /** The soonest date being watched, already formatted (e.g. "Sep 12"), or null
   *  when there isn't a dated clock to name. */
  dateLabel: string | null;
  /** Parent said yes → request OS permission and turn reminders on. */
  onEnable: () => void;
  /** Parent said not now → remember and don't ask again. */
  onDismiss: () => void;
}

const STRINGS: Record<
  FunnelLocale,
  { title: string; bodyWithDate: (d: string) => string; bodyNoDate: string; note: string; yes: string; no: string }
> = {
  en: {
    title: 'Want Waypoint to watch your deadlines?',
    bodyWithDate: (d) => `You don't have to keep checking. We'll tell you if ${d} passes without a reply — even with the app closed.`,
    bodyNoDate: "You don't have to keep checking. We'll tell you when a deadline nears or passes — even with the app closed.",
    note: 'A reminder as a date nears, and a nudge with the next step if it passes. Nothing else — no ads, no noise.',
    yes: 'Yes, keep an eye on it',
    no: 'Not now',
  },
  es: {
    title: '¿Quiere que Waypoint vigile sus fechas límite?',
    bodyWithDate: (d) => `No tiene que seguir revisando. Le avisaremos si el ${d} pasa sin respuesta — incluso con la app cerrada.`,
    bodyNoDate: 'No tiene que seguir revisando. Le avisaremos cuando una fecha límite se acerque o pase — incluso con la app cerrada.',
    note: 'Un recordatorio cuando se acerque la fecha, y un aviso con el siguiente paso si pasa. Nada más — sin anuncios, sin ruido.',
    yes: 'Sí, que la vigile',
    no: 'Ahora no',
  },
  vi: {
    title: 'Muốn Waypoint theo dõi các hạn chót của quý vị?',
    bodyWithDate: (d) => `Quý vị không phải kiểm tra liên tục. Chúng tôi sẽ báo nếu ${d} trôi qua mà chưa có phản hồi — ngay cả khi đã đóng ứng dụng.`,
    bodyNoDate: 'Quý vị không phải kiểm tra liên tục. Chúng tôi sẽ báo khi một hạn chót đến gần hoặc trôi qua — ngay cả khi đã đóng ứng dụng.',
    note: 'Một lời nhắc khi ngày đến gần, và một gợi ý bước tiếp theo nếu ngày trôi qua. Không gì khác — không quảng cáo, không làm phiền.',
    yes: 'Vâng, hãy theo dõi giúp tôi',
    no: 'Không phải bây giờ',
  },
};

export default function NotificationPrimingSheet({ visible, locale, dateLabel, onEnable, onDismiss }: Props) {
  const t = STRINGS[locale];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.scrim}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.grabber} />
          <View style={styles.bell}>
            <Ionicons name="notifications-outline" size={30} color={colors.teal} />
          </View>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.body}>{dateLabel ? t.bodyWithDate(dateLabel) : t.bodyNoDate}</Text>

          <View style={styles.noteRow}>
            <Ionicons name="time-outline" size={18} color={colors.mid} />
            <Text style={styles.note}>{t.note}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.dim]}
            onPress={onEnable}
            accessibilityRole="button"
            accessibilityLabel={t.yes}
          >
            <Text style={styles.ctaText}>{t.yes}</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={t.no}
          >
            <Text style={styles.secondaryText}>{t.no}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.base },
  bell: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E0F7FA', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.base },
  title: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.extrabold as '800', color: colors.navy, textAlign: 'center', lineHeight: 28 },
  body: { fontSize: fonts.sizes.base, color: colors.dark, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
  noteRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: radii.md, padding: spacing.md, marginTop: spacing.base },
  note: { flex: 1, fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 19 },
  cta: {
    minHeight: MIN_TOUCH_TARGET + 4,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  ctaText: { color: colors.white, fontWeight: fonts.weights.bold as '700', fontSize: fonts.sizes.md },
  dim: { opacity: 0.6 },
  secondary: { minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  secondaryText: { color: colors.mid, fontWeight: fonts.weights.semibold as '600', fontSize: fonts.sizes.base },
});

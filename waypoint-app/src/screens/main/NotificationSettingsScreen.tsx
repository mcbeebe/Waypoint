/**
 * NotificationSettingsScreen — the family's control over the outbound loop
 * (phase 7, initiative 003). Reached from the Account menu. Master switch (tied
 * to OS permission), per-category toggles, quiet hours, and a test send. Turning
 * anything on requests OS permission first; if the parent declines, the master
 * stays off and we don't lie about watching.
 */
import React, { useCallback } from 'react';
import { View, Text, Switch, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useI18n } from '@/i18n';
import { toFunnelLocale, type FunnelLocale } from '@/lib/eligibility';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import { useNotifications } from '@/hooks/useNotifications';
import { colors, fonts, spacing, radii } from '@/lib/theme';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';

const S: Record<FunnelLocale, Record<string, string>> = {
  en: {
    title: 'Notifications',
    master: 'Let Waypoint reach me',
    masterHint: 'So you can close the app and trust us to watch',
    section: 'WHAT WE\'LL TELL YOU ABOUT',
    deadlines: 'Deadlines nearing or passed',
    deadlinesHint: 'On-device · works offline',
    actions: 'Plan steps coming due',
    quiet: 'QUIET HOURS',
    dnd: "Don't disturb",
    dndHint: '9:00 PM – 8:00 AM · your time',
    test: 'Send a test notification',
    testTitle: 'Waypoint is watching',
    testBody: "You're all set. We'll reach you here when a date needs you.",
  },
  es: {
    title: 'Notificaciones',
    master: 'Permitir que Waypoint me avise',
    masterHint: 'Para que pueda cerrar la app y confiar en que vigilamos',
    section: 'DE QUÉ LE AVISAREMOS',
    deadlines: 'Fechas límite cercanas o vencidas',
    deadlinesHint: 'En el dispositivo · funciona sin conexión',
    actions: 'Pasos del plan por vencer',
    quiet: 'HORAS DE SILENCIO',
    dnd: 'No molestar',
    dndHint: '9:00 PM – 8:00 AM · su hora',
    test: 'Enviar una notificación de prueba',
    testTitle: 'Waypoint está vigilando',
    testBody: 'Todo listo. Le avisaremos aquí cuando una fecha lo necesite.',
  },
  vi: {
    title: 'Thông báo',
    master: 'Cho phép Waypoint nhắc tôi',
    masterHint: 'Để quý vị có thể đóng ứng dụng và tin rằng chúng tôi đang theo dõi',
    section: 'CHÚNG TÔI SẼ BÁO VỀ',
    deadlines: 'Hạn chót sắp đến hoặc đã qua',
    deadlinesHint: 'Trên thiết bị · hoạt động ngoại tuyến',
    actions: 'Các bước kế hoạch sắp đến hạn',
    quiet: 'GIỜ YÊN LẶNG',
    dnd: 'Không làm phiền',
    dndHint: '9:00 tối – 8:00 sáng · giờ của quý vị',
    test: 'Gửi thông báo thử',
    testTitle: 'Waypoint đang theo dõi',
    testBody: 'Đã sẵn sàng. Chúng tôi sẽ nhắc quý vị ở đây khi có ngày cần đến.',
  },
};

export default function NotificationSettingsScreen() {
  const { locale } = useI18n();
  const fl = toFunnelLocale(locale);
  const t = S[fl];
  const { prefs, loaded, update } = useNotificationPrefs();
  const { requestPermission } = useNotifications();

  // Turning the master on: get OS permission first; only enable if granted.
  const toggleMaster = useCallback(
    async (on: boolean) => {
      if (on) {
        const granted = await requestPermission();
        await update({ enabled: granted });
      } else {
        await update({ enabled: false });
      }
    },
    [requestPermission, update]
  );

  const sendTest = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: t.testTitle, body: t.testBody, sound: true },
        // A couple of seconds out so the parent sees it arrive, not fire mid-tap.
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 2000),
        },
      });
    } catch {
      // Non-critical.
    }
  }, [requestPermission, t]);

  const disabled = !loaded || !prefs.enabled;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Row
            label={t.master}
            hint={t.masterHint}
            value={prefs.enabled}
            onValueChange={toggleMaster}
            disabled={!loaded}
          />
        </View>

        <Text style={styles.sectionLabel}>{t.section}</Text>
        <View style={styles.card}>
          <Row
            label={t.deadlines}
            hint={t.deadlinesHint}
            value={prefs.deadlines}
            onValueChange={(v) => update({ deadlines: v })}
            disabled={disabled}
            divider
          />
          <Row
            label={t.actions}
            value={prefs.actions}
            onValueChange={(v) => update({ actions: v })}
            disabled={disabled}
          />
        </View>

        {/* Quiet hours is deferred to Lane B: every Lane-A reminder fires at a
            civil 9am, so a 9pm–8am window would gate nothing. It becomes a real
            control once reply pushes (which can arrive at any hour) ship. */}

        <Pressable
          style={styles.testRow}
          onPress={sendTest}
          accessibilityRole="button"
          accessibilityLabel={t.test}
        >
          <Text style={styles.testText}>{t.test}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  hint,
  value,
  onValueChange,
  disabled,
  divider,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, disabled && styles.dim]}>{label}</Text>
        {!!hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.teal, false: '#CBD5E1' }}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.extrabold as '800',
    letterSpacing: 0.5,
    color: colors.mid,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH_TARGET + 12, paddingVertical: spacing.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowBody: { flex: 1, paddingRight: spacing.md },
  rowLabel: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold as '600', color: colors.navy },
  rowHint: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  dim: { opacity: 0.5 },
  testRow: { minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  testText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold as '700', color: colors.teal },
});

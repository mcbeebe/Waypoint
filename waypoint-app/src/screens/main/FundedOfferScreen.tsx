/**
 * Funded Offer & Booking (PRD W-B: B2/B3) — the conversion moment. States
 * who pays honestly (RC during enrollment; a family-approved budget line
 * after), makes the independence pledge (W&I §4685.8) a first-class
 * section, and books the intro call in-app. Declining is a real button.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useAppointments } from '@/hooks/useAppointments';
import { nextIntroSlots } from '@/lib/introSlots';
import { trackFunnelStep } from '@/lib/analytics';
import { useToast } from '@/components/Toast';
import { useI18n } from '@/i18n';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

/**
 * Screen chrome in EN/ES/VI. The
 * appointment record itself (title/notes) stays English — it is shared
 * operational data read by staff.
 */
const STRINGS: Record<FunnelLocale, {
  title: string;
  freeBadge: string;
  navCardTitle: string;
  navCardBody: string;
  whoPays: string;
  payEnrollLead: (name: string) => string;
  payEnrollRest: (name: string) => string;
  payAfterLead: (name: string) => string;
  payAfterRest: string;
  pledgeLead: (name: string) => string;
  pledgeRest: string;
  whatNext: string;
  steps: Array<[string, string]>;
  pickTime: string;
  slotNote: string;
  bookingLabel: string;
  bookCta: (day: string, time: string) => string;
  decline: string;
  bookError: string;
  confirmTitle: string;
  confirmBody: (day: string, time: string) => string;
  done: string;
  yourChild: string;
}> = {
  en: {
    title: 'Getting started',
    freeBadge: '✓ No cost to you',
    navCardTitle: 'Work with a Navigator, free to you',
    navCardBody:
      'A real person who has done this for their own child walks you through Self-Determination enrollment end to end.',
    whoPays: 'Who pays for this?',
    payEnrollLead: () => 'While you enroll: your Regional Center pays.',
    payEnrollRest: (name) =>
      ` Up to $1,000 for ${name}'s person-centered plan and up to 40 hours of transition help — billed to the Regional Center, not to you.`,
    payAfterLead: (name) => `After you're enrolled: a line you approve in ${name}'s budget.`,
    payAfterRest: ' You set the price with us, see it in the plan, and can stop at any time.',
    pledgeLead: (name) => `We never sell services on ${name}'s plan.`,
    pledgeRest:
      ' State law (W&I §4685.8) makes your facilitator independent — our only loyalty is to you.',
    whatNext: 'What happens next',
    steps: [
      ['A 30-minute call', ' — we confirm eligibility and answer your questions. No commitment.'],
      ['We handle the paperwork', ' — orientation, the person-centered plan, your budget certification.'],
      ['You approve everything', ' before anything is submitted.'],
    ],
    pickTime: 'Pick a time',
    slotNote: 'Evening times available on request.',
    bookingLabel: 'Booking…',
    bookCta: (day, time) => `Book ${day} · ${time}`,
    decline: 'Keep using Waypoint free instead',
    bookError: 'Could not book the call — please try again.',
    confirmTitle: "You're booked ✓",
    confirmBody: (day, time) =>
      `${day} at ${time} — 30 minutes, no commitment. It's on your Waypoint calendar, and everything stays free either way.`,
    done: 'Done',
    yourChild: 'your child',
  },
  es: {
    title: 'Cómo empezar',
    freeBadge: '✓ Sin costo para usted',
    navCardTitle: 'Trabaje con un Navegador, gratis para usted',
    navCardBody:
      'Una persona real que ya hizo esto por su propio hijo/a le acompaña en la inscripción a la Autodeterminación de principio a fin.',
    whoPays: '¿Quién paga esto?',
    payEnrollLead: () => 'Mientras se inscribe: paga su Centro Regional.',
    payEnrollRest: (name) =>
      ` Hasta $1,000 para el plan centrado en la persona de ${name} y hasta 40 horas de ayuda de transición — facturado al Centro Regional, no a usted.`,
    payAfterLead: (name) =>
      `Después de inscribirse: una línea que usted aprueba en el presupuesto de ${name}.`,
    payAfterRest:
      ' Usted fija el precio con nosotros, lo ve en el plan y puede parar en cualquier momento.',
    pledgeLead: (name) => `Nunca vendemos servicios en el plan de ${name}.`,
    pledgeRest:
      ' La ley estatal (W&I §4685.8) hace que su facilitador sea independiente — nuestra única lealtad es hacia usted.',
    whatNext: 'Qué sigue',
    steps: [
      ['Una llamada de 30 minutos', ' — confirmamos la elegibilidad y respondemos sus preguntas. Sin compromiso.'],
      ['Nosotros manejamos el papeleo', ' — la orientación, el plan centrado en la persona, la certificación de su presupuesto.'],
      ['Usted aprueba todo', ' antes de que se envíe cualquier cosa.'],
    ],
    pickTime: 'Elija una hora',
    slotNote: 'Horarios de tarde-noche disponibles a solicitud.',
    bookingLabel: 'Reservando…',
    bookCta: (day, time) => `Reservar ${day} · ${time}`,
    decline: 'Seguir usando Waypoint gratis',
    bookError: 'No se pudo reservar la llamada — inténtelo de nuevo.',
    confirmTitle: 'Su llamada está reservada ✓',
    confirmBody: (day, time) =>
      `${day} a las ${time} — 30 minutos, sin compromiso. Está en su calendario de Waypoint, y todo sigue siendo gratis de cualquier manera.`,
    done: 'Listo',
    yourChild: 'su hijo/a',
  },
  vi: {
    title: 'Bắt đầu',
    freeBadge: '✓ Miễn phí cho quý vị',
    navCardTitle: 'Làm việc với một Người dẫn đường, miễn phí cho quý vị',
    navCardBody:
      'Một người thật, từng làm điều này cho chính con mình, sẽ đồng hành cùng quý vị qua toàn bộ quá trình ghi danh Tự quyết.',
    whoPays: 'Ai trả tiền cho việc này?',
    payEnrollLead: () => 'Trong lúc ghi danh: Trung tâm Khu vực của quý vị trả.',
    payEnrollRest: (name) =>
      ` Tối đa $1,000 cho kế hoạch lấy con người làm trung tâm của ${name} và tối đa 40 giờ hỗ trợ chuyển đổi — tính cho Trung tâm Khu vực, không phải cho quý vị.`,
    payAfterLead: (name) =>
      `Sau khi ghi danh: một khoản do quý vị phê duyệt trong ngân sách của ${name}.`,
    payAfterRest:
      ' Quý vị thỏa thuận giá với chúng tôi, thấy nó trong kế hoạch, và có thể dừng bất cứ lúc nào.',
    pledgeLead: (name) => `Chúng tôi không bao giờ bán dịch vụ trong kế hoạch của ${name}.`,
    pledgeRest:
      ' Luật tiểu bang (W&I §4685.8) yêu cầu người hỗ trợ của quý vị phải độc lập — lòng trung thành duy nhất của chúng tôi là với quý vị.',
    whatNext: 'Điều gì diễn ra tiếp theo',
    steps: [
      ['Một cuộc gọi 30 phút', ' — chúng tôi xác nhận điều kiện và trả lời câu hỏi của quý vị. Không ràng buộc.'],
      ['Chúng tôi lo giấy tờ', ' — buổi định hướng, kế hoạch lấy con người làm trung tâm, chứng nhận ngân sách của quý vị.'],
      ['Quý vị phê duyệt mọi thứ', ' trước khi bất cứ điều gì được gửi đi.'],
    ],
    pickTime: 'Chọn giờ',
    slotNote: 'Có giờ buổi tối theo yêu cầu.',
    bookingLabel: 'Đang đặt…',
    bookCta: (day, time) => `Đặt ${day} · ${time}`,
    decline: 'Tiếp tục dùng Waypoint miễn phí',
    bookError: 'Không đặt được cuộc gọi — vui lòng thử lại.',
    confirmTitle: 'Đã đặt lịch ✓',
    confirmBody: (day, time) =>
      `${day} lúc ${time} — 30 phút, không ràng buộc. Đã có trong lịch Waypoint của quý vị, và mọi thứ vẫn miễn phí dù thế nào.`,
    done: 'Xong',
    yourChild: 'con quý vị',
  },
};

export default function FundedOfferScreen() {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const child = children[0];
  const { createAppointment } = useAppointments({ familyId: family?.id ?? '' });
  const { showToast } = useToast();
  const { locale } = useI18n();
  const funnelLocale: FunnelLocale = toFunnelLocale(locale);
  const S = STRINGS[funnelLocale];

  const slots = useMemo(() => nextIntroSlots(), []);
  const [selected, setSelected] = useState(1);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  const childName = child?.first_name || S.yourChild;

  // Funnel (B4): offer viewed, once per mount.
  const tracked = useRef(false);
  useEffect(() => {
    if (family?.id && !tracked.current) {
      tracked.current = true;
      trackFunnelStep(family.id, 'funded_offer_viewed');
    }
  }, [family?.id]);

  const pickSlot = (i: number) => {
    setSelected(i);
    if (family?.id) trackFunnelStep(family.id, 'booking_started');
  };

  const book = async () => {
    if (!family?.id || booking) return;
    setBooking(true);
    try {
      const slot = slots[selected];
      const start = new Date(slot.startIso);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const appt = await createAppointment({
        title: 'Waypoint Navigator intro call',
        appointment_type: 'other',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes:
          'Free 30-minute call: confirm Self-Determination eligibility and answer your questions. No commitment.',
      });
      if (!appt) {
        showToast(S.bookError, 'error');
        return;
      }
      await trackFunnelStep(family.id, 'booking_completed');
      setBooked(true);
    } finally {
      setBooking(false);
    }
  };

  if (booked) {
    const slot = slots[selected];
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.confirmTitle}>{S.confirmTitle}</Text>
        <Text style={styles.confirmBody}>{S.confirmBody(slot.dayLabel, slot.timeLabel)}</Text>
        <Pressable style={styles.cta} onPress={() => (navigation as any).navigate('HomeMain')}>
          <Text style={styles.ctaText}>{S.done}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={styles.headRow}>
          <Text style={styles.title}>{S.title}</Text>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>{S.freeBadge}</Text>
          </View>
        </View>

        <View style={styles.navCard}>
          <Text style={styles.navCardTitle}>{S.navCardTitle}</Text>
          <Text style={styles.navCardBody}>{S.navCardBody}</Text>
        </View>

        <Text style={styles.section}>{S.whoPays}</Text>
        <View style={styles.card}>
          <View style={styles.bullet}>
            <View style={styles.dotTeal} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>{S.payEnrollLead(childName)}</Text>
              {S.payEnrollRest(childName)}
            </Text>
          </View>
          <View style={styles.bullet}>
            <View style={styles.dotTeal} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>{S.payAfterLead(childName)}</Text>
              {S.payAfterRest}
            </Text>
          </View>
          <View style={styles.bullet}>
            <View style={styles.dotSage} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>{S.pledgeLead(childName)}</Text>
              {S.pledgeRest}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>{S.whatNext}</Text>
        <View style={styles.stepList}>
          {S.steps.map(([lead, rest], i) => (
            <View key={lead} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}.</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>{lead}</Text>
                {rest}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>{S.pickTime}</Text>
        <View style={styles.slotGrid}>
          {slots.map((slot, i) => (
            <Pressable
              key={slot.startIso}
              style={[styles.slot, i === selected && styles.slotSelected]}
              onPress={() => pickSlot(i)}
            >
              <Text style={[styles.slotDay, i === selected && styles.slotTextSelected]}>
                {slot.dayLabel}
              </Text>
              <Text style={[styles.slotTime, i === selected && styles.slotTextSelected]}>
                {slot.timeLabel}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.slotNote}>{S.slotNote}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.cta, booking && styles.ctaDisabled]} onPress={book}>
          <Text style={styles.ctaText}>
            {booking
              ? S.bookingLabel
              : S.bookCta(slots[selected].dayLabel, slots[selected].timeLabel)}
          </Text>
        </Pressable>
        <Pressable style={styles.decline} onPress={() => (navigation as any).navigate('HomeMain')}>
          <Text style={styles.declineText}>{S.decline}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  confirmTitle: {
    fontSize: fonts.sizes['3xl'],
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
    textAlign: 'center',
  },
  confirmBody: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontSize: fonts.sizes.base,
    color: colors.dark,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 420,
  },
  content: { padding: spacing.base, paddingBottom: spacing.base },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  freeBadge: {
    backgroundColor: semantic.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  freeBadgeText: { color: semantic.success, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.sm },
  navCard: {
    marginTop: spacing.md,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  navCardTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  navCardBody: { marginTop: spacing.xs, fontSize: fonts.sizes.md, color: colors.mid, lineHeight: 19 },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    gap: spacing.md,
  },
  bullet: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  dotTeal: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    marginTop: 6,
  },
  dotSage: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.sage,
    marginTop: 6,
  },
  bulletText: { flex: 1, fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 20 },
  bold: { fontWeight: fonts.weights.bold, color: colors.navy },
  stepList: { gap: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.md },
  stepNum: { fontWeight: fonts.weights.extrabold, color: colors.teal, fontSize: fonts.sizes.md },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: '48%',
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  slotSelected: { backgroundColor: colors.teal, borderColor: colors.teal },
  slotDay: { fontWeight: fonts.weights.bold, color: colors.navy, fontSize: fonts.sizes.md },
  slotTime: { color: colors.mid, fontSize: fonts.sizes.sm, marginTop: 2 },
  slotTextSelected: { color: colors.white },
  slotNote: { marginTop: spacing.sm, fontSize: fonts.sizes.sm, color: colors.mid },
  footer: {
    padding: spacing.base,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  cta: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  decline: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { color: colors.dark, fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
});

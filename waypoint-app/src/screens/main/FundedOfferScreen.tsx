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
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

export default function FundedOfferScreen() {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const child = children[0];
  const { createAppointment } = useAppointments({ familyId: family?.id ?? '' });
  const { showToast } = useToast();

  const slots = useMemo(() => nextIntroSlots(), []);
  const [selected, setSelected] = useState(1);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  const childName = child?.first_name || 'your child';

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
        showToast('Could not book the call — please try again.', 'error');
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
        <Text style={styles.confirmTitle}>You&apos;re booked ✓</Text>
        <Text style={styles.confirmBody}>
          {slot.dayLabel} at {slot.timeLabel} — 30 minutes, no commitment. It&apos;s on
          your Waypoint calendar, and everything stays free either way.
        </Text>
        <Pressable style={styles.cta} onPress={() => (navigation as any).navigate('HomeMain')}>
          <Text style={styles.ctaText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={styles.headRow}>
          <Text style={styles.title}>Getting started</Text>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>✓ No cost to you</Text>
          </View>
        </View>

        <View style={styles.navCard}>
          <Text style={styles.navCardTitle}>Work with a Navigator, free to you</Text>
          <Text style={styles.navCardBody}>
            A real person who has done this for their own child walks you through
            Self-Determination enrollment end to end.
          </Text>
        </View>

        <Text style={styles.section}>Who pays for this?</Text>
        <View style={styles.card}>
          <View style={styles.bullet}>
            <View style={styles.dotTeal} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>While you enroll: your Regional Center pays.</Text> Up
              to $1,000 for {childName}&apos;s person-centered plan and up to 40 hours of
              transition help — billed to the Regional Center, not to you.
            </Text>
          </View>
          <View style={styles.bullet}>
            <View style={styles.dotTeal} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>After you&apos;re enrolled: a line you approve in{' '}
              {childName}&apos;s budget.</Text> You set the price with us, see it in the plan,
              and can stop at any time.
            </Text>
          </View>
          <View style={styles.bullet}>
            <View style={styles.dotSage} />
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>We never sell services on {childName}&apos;s plan.</Text>{' '}
              State law (W&amp;I §4685.8) makes your facilitator independent — our only
              loyalty is to you.
            </Text>
          </View>
        </View>

        <Text style={styles.section}>What happens next</Text>
        <View style={styles.stepList}>
          {[
            ['A 30-minute call', ' — we confirm eligibility and answer your questions. No commitment.'],
            ['We handle the paperwork', ' — orientation, the person-centered plan, your budget certification.'],
            ['You approve everything', ' before anything is submitted.'],
          ].map(([lead, rest], i) => (
            <View key={lead} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}.</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>{lead}</Text>
                {rest}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Pick a time</Text>
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
        <Text style={styles.slotNote}>Evening times available on request.</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.cta, booking && styles.ctaDisabled]} onPress={book}>
          <Text style={styles.ctaText}>
            {booking
              ? 'Booking…'
              : `Book ${slots[selected].dayLabel} · ${slots[selected].timeLabel}`}
          </Text>
        </Pressable>
        <Pressable style={styles.decline} onPress={() => (navigation as any).navigate('HomeMain')}>
          <Text style={styles.declineText}>Keep using Waypoint free instead</Text>
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

/**
 * Agency Directory (roadmap 1.2) — the 8 agencies every California family
 * navigates, with services, statute-cited rights, and the pitfall to avoid.
 * Regional Center / Early Start entries are personalized to the family's
 * actual RC from their ZIP code.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '@/hooks/useFamily';
import { AGENCIES } from '@/data/agencies';
import { lookupRC } from '@/data/regionalCenters';
import type { Agency } from '@/data/types';
import { Card, Chip } from '@/components/ui';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, spacing, radii, semantic } from '@/lib/theme';

export default function AgenciesScreen() {
  const { family } = useFamily();
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const [selected, setSelected] = useState<Agency | null>(null);

  const rc = useMemo(
    () => (family?.zip_code ? lookupRC(family.zip_code) : null),
    [family?.zip_code]
  );

  // Personalize dynamic entries (Regional Center, Early Start) with the real RC
  const agencies = useMemo(
    () =>
      AGENCIES.map(a =>
        a.dynamic && rc
          ? { ...a, name: a.key === 'earlystart' ? `Early Start — ${rc.name}` : rc.name, phone: rc.phone, website: rc.website }
          : a
      ),
    [rc]
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { fontSize: sz(14), lineHeight: sz(21) }]}>
          The agencies that serve your family — what they do, what you're entitled to, and
          what to watch out for.{rc ? ` Personalized for ${rc.name}.` : ''}
        </Text>

        {agencies.map(agency => (
          <TouchableOpacity
            key={agency.key}
            onPress={() => setSelected(agency)}
            accessibilityRole="button"
            accessibilityLabel={`${agency.name} — open details`}
          >
            <Card>
              <View style={styles.cardHead}>
                <View style={styles.cardHeadText}>
                  <Chip label={agency.type} tone="info" textSize={sz(11)} />
                  <Text style={[styles.agencyName, { fontSize: sz(16) }]}>{agency.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mid} />
              </View>
              <Text style={[styles.agencyWhat, { fontSize: sz(13), lineHeight: sz(19) }]} numberOfLines={2}>
                {agency.what}
              </Text>
              <Text style={[styles.agencyPhone, { fontSize: sz(13) }]}>📞 {agency.phone}</Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={selected !== null} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.modalHeader}>
              <Chip label={selected.type} tone="info" textSize={sz(11)} />
              <TouchableOpacity
                onPress={() => setSelected(null)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.mid} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { fontSize: sz(22) }]}>{selected.name}</Text>

              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => Linking.openURL(`tel:${selected.phone.replace(/\D/g, '')}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`Call ${selected.phone}`}
                >
                  <Text style={[styles.contactButtonText, { fontSize: sz(14) }]}>📞 {selected.phone}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, styles.webButton]}
                  onPress={() => Linking.openURL(selected.website.startsWith('http') ? selected.website : `https://${selected.website}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`Open website ${selected.website}`}
                >
                  <Text style={[styles.contactButtonText, styles.webButtonText, { fontSize: sz(14) }]}>🌐 Website</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalBody, { fontSize: sz(14.5), lineHeight: sz(22) }]}>{selected.what}</Text>

              <Card tone="info">
                <Text style={[styles.cardLabel, { fontSize: sz(11), color: semantic.info }]}>WHY THIS MATTERS</Text>
                <Text style={[styles.modalBody, { fontSize: sz(14), lineHeight: sz(21), marginBottom: 0 }]}>
                  {selected.whyMatters}
                </Text>
              </Card>

              <Card>
                <Text style={[styles.cardLabel, { fontSize: sz(11) }]}>SERVICES</Text>
                {selected.services.map((s, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={[styles.bullet, { fontSize: sz(14) }]}>•</Text>
                    <Text style={[styles.bulletText, { fontSize: sz(14), lineHeight: sz(21) }]}>{s}</Text>
                  </View>
                ))}
              </Card>

              <Card tone="success">
                <Text style={[styles.cardLabel, { fontSize: sz(11), color: semantic.success }]}>YOUR RIGHTS</Text>
                {selected.rights.map((r, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={[styles.bullet, { fontSize: sz(14), color: semantic.success }]}>⚖️</Text>
                    <Text style={[styles.bulletText, { fontSize: sz(14), lineHeight: sz(21) }]}>{r}</Text>
                  </View>
                ))}
              </Card>

              <Card tone="warning">
                <Text style={[styles.cardLabel, { fontSize: sz(11), color: semantic.warning }]}>⚠️ WATCH OUT</Text>
                <Text style={[styles.modalBody, { fontSize: sz(14), lineHeight: sz(21), marginBottom: 0 }]}>
                  {selected.watchOut}
                </Text>
              </Card>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  intro: {
    color: colors.mid,
    marginBottom: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeadText: {
    flex: 1,
    gap: 6,
  },
  agencyName: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  agencyWhat: {
    color: colors.dark,
    marginTop: 6,
  },
  agencyPhone: {
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
    marginTop: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  closeButton: {
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  contactButton: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    flexGrow: 1,
    alignItems: 'center',
  },
  contactButtonText: {
    color: colors.white,
    fontWeight: fonts.weights.bold as '700',
  },
  webButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
  },
  webButtonText: {
    color: colors.teal,
  },
  modalBody: {
    color: colors.dark,
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.mid,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  bullet: {
    color: colors.teal,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    color: colors.dark,
  },
});

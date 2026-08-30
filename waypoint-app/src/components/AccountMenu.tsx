/**
 * The avatar menu (Home rebuild phase 5) — where Profile goes when it leaves
 * the tab bar.
 *
 * Four tabs is the whole point of the redesign, and Profile was the fifth. It
 * is not a place a parent visits daily, but everything it held has to stay
 * one tap away — settings, family sharing, documents, and the subscription.
 */
import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { accountMenuItems } from '@/lib/accountMenu';
import type { AccountMenuItem } from '@/lib/accountMenu';
import type { FunnelLocale } from '@/lib/eligibility';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, radii, spacing } from '@/lib/theme';

interface AccountMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: AccountMenuItem) => void;
  locale: FunnelLocale;
  /** Shown at the top so a parent knows whose account this is. */
  name?: string | null;
}

export default function AccountMenu({
  visible,
  onClose,
  onSelect,
  locale,
  name,
}: AccountMenuProps) {
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const items = accountMenuItems(locale);
  const closeLabel = locale === 'es' ? 'Cerrar' : locale === 'vi' ? 'Đóng' : 'Close';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
      >
        <SafeAreaView edges={['top']} style={styles.safe}>
          {/* Stops a tap inside the sheet from closing it. */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            {!!name && (
              <Text style={[styles.name, { fontSize: sz(13), lineHeight: sz(18) }]}>{name}</Text>
            )}
            {items.map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [styles.item, pressed && styles.dim]}
                onPress={() => {
                  onClose();
                  onSelect(item);
                }}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
              >
                <Ionicons name={item.icon as never} size={19} color={colors.mid} />
                <Text style={[styles.itemText, { fontSize: sz(14), lineHeight: sz(19) }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)' },
  safe: { alignItems: 'flex-end' },
  sheet: {
    marginTop: spacing.xl * 2,
    marginRight: spacing.base,
    minWidth: 240,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    shadowColor: colors.deep,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  name: {
    color: colors.mid,
    fontWeight: fonts.weights.bold,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.base,
  },
  itemText: { color: colors.navy, fontWeight: fonts.weights.semibold, flex: 1 },
  dim: { opacity: 0.6 },
});

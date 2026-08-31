/**
 * PageHeader — the shared warm header band (initiative 006, phase 2).
 *
 * The warm system's single header, replacing both the old cold flatness and
 * Journey's bespoke navy hero. A light paper band with the Waypoint marker and
 * an ink title — never the dark "insurance-portal" chrome the audience critique
 * flagged. Optional back button, right slot, subtitle, and `children` (an ask
 * bar, a progress rail, filter chips) rendered beneath the title block.
 *
 * Colors come from the `brand` tokens; type stays on the system font until the
 * Newsreader/Hanken packages land (see the deferred-deps checklist) — a later
 * one-line swap, no layout change.
 *
 * Not yet imported by any screen — screens migrate onto it in phase 3.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brandmark } from './Brandmark';
import { useTextScale } from '@/lib/textSize';
import { brand, fonts, spacing } from '@/lib/theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Show a back chevron and call this when tapped. */
  onBack?: () => void;
  /** Show the Waypoint marker before the title. Default true. */
  mark?: boolean;
  /** A trailing element (avatar, action) on the title row. */
  right?: React.ReactNode;
  /** Rendered under the title block — an ask bar, a progress rail, chips. */
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  mark = true,
  right,
  children,
}: PageHeaderProps) {
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={sz(22)} color={brand.ink} />
          </TouchableOpacity>
        ) : null}
        {mark ? <Brandmark size={sz(26)} /> : null}
        <Text style={[styles.title, { fontSize: sz(20) }]} numberOfLines={2}>
          {title}
        </Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { fontSize: sz(13.5), lineHeight: sz(19) }]}>
          {subtitle}
        </Text>
      ) : null}
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

export default PageHeader;

const styles = StyleSheet.create({
  container: {
    backgroundColor: brand.headerTop,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  back: { marginRight: 2 },
  title: {
    flex: 1,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
  },
  right: { marginLeft: spacing.sm },
  subtitle: {
    color: brand.inkSoft,
    marginTop: 5,
  },
  children: { marginTop: spacing.md },
});

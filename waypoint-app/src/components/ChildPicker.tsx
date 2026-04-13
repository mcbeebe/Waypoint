/**
 * Multi-child picker component
 * Shows a dropdown when the family has more than one child.
 * Persists selection to AsyncStorage so it survives app restarts.
 * Provides useSelectedChild() hook for screen-level filtering.
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Child } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const SELECTED_CHILD_KEY = 'waypoint_selected_child_id';

// ─── Context ─────────────────────────────────────────────────────────────────

interface SelectedChildContextValue {
  selectedChild: Child | null;
  setSelectedChild: (child: Child) => void;
  children: Child[];
}

const SelectedChildContext = createContext<SelectedChildContextValue>({
  selectedChild: null,
  setSelectedChild: () => {},
  children: [],
});

export function useSelectedChild(): SelectedChildContextValue {
  return useContext(SelectedChildContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function SelectedChildProvider({
  childRecords,
  children,
}: {
  childRecords: Child[];
  children: React.ReactNode;
}) {
  const [selectedChild, setSelectedChildState] = useState<Child | null>(null);

  // Load persisted selection
  useEffect(() => {
    (async () => {
      const storedId = await AsyncStorage.getItem(SELECTED_CHILD_KEY);
      if (storedId) {
        const found = childRecords.find((c) => c.id === storedId);
        if (found) {
          setSelectedChildState(found);
          return;
        }
      }
      // Default to primary child or first child
      const primary = childRecords.find((c) => c.is_primary) || childRecords[0] || null;
      setSelectedChildState(primary);
    })();
  }, [childRecords]);

  const setSelectedChild = useCallback((child: Child) => {
    setSelectedChildState(child);
    AsyncStorage.setItem(SELECTED_CHILD_KEY, child.id);
  }, []);

  return (
    <SelectedChildContext.Provider value={{ selectedChild, setSelectedChild, children: childRecords }}>
      {children}
    </SelectedChildContext.Provider>
  );
}

// ─── Picker UI ───────────────────────────────────────────────────────────────

export function ChildPicker() {
  const { selectedChild, setSelectedChild, children } = useSelectedChild();
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if 0 or 1 child
  if (children.length <= 1) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setIsOpen(!isOpen)}
        accessibilityRole="button"
        accessibilityLabel={`Selected child: ${selectedChild?.first_name ?? 'None'}. Tap to switch.`}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {selectedChild?.first_name ?? 'Select child'}
        </Text>
        <Text style={styles.triggerArrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdown}>
          {children.map((child) => {
            const isSelected = child.id === selectedChild?.id;
            return (
              <TouchableOpacity
                key={child.id}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => {
                  setSelectedChild(child);
                  setIsOpen(false);
                }}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {child.first_name}
                </Text>
                {child.is_primary && (
                  <Text style={styles.primaryBadge}>Primary</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  triggerText: {
    fontSize: fonts.sizes.sm,
    color: colors.navy,
    fontWeight: fonts.weights.medium as '500',
    maxWidth: 120,
  },
  triggerArrow: {
    fontSize: 8,
    color: colors.mid,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    gap: 8,
  },
  optionSelected: {
    backgroundColor: '#E6F7F5',
  },
  optionText: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  primaryBadge: {
    fontSize: 9,
    color: colors.mid,
    backgroundColor: colors.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
});

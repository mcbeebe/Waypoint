/**
 * Bottom tab navigator — 5 main tabs
 * Ported from GAS MVP nav bar (Home, Ask AI, Actions, Calendar, Profile)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from '@/screens/main/HomeScreen';
import ProfileScreen from '@/screens/main/ProfileScreen';
import { colors, fonts, spacing } from '@/lib/theme';
import type { MainTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator();

// ─── Placeholder screens for Sprint 2-4 ────────────────────────────────────

function PlaceholderScreen({ title, sprint }: { title: string; sprint: string }) {
  return (
    <SafeAreaView style={styles.placeholder}>
      <Text style={styles.placeholderEmoji}>🚧</Text>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderSubtitle}>Coming in {sprint}</Text>
    </SafeAreaView>
  );
}

function NavigatorScreen() {
  return <PlaceholderScreen title="AI Navigator" sprint="Sprint 2" />;
}

function ActionsScreen() {
  return <PlaceholderScreen title="Action Plan" sprint="Sprint 3" />;
}

function CalendarScreen() {
  return <PlaceholderScreen title="Calendar & Deadlines" sprint="Sprint 4" />;
}

// ─── Tab Icons (simple text-based until we add an icon library) ─────────────

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {emoji}
    </Text>
  );
}

// ─── Main Tab Navigator ─────────────────────────────────────────────────────

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.mid,
        tabBarLabelStyle: {
          fontSize: fonts.sizes.xs,
          fontWeight: fonts.weights.semibold as '600',
        },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 56,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Navigator"
        component={NavigatorScreen}
        options={{
          tabBarLabel: 'Ask AI',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="🧭" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Tracker"
        component={ActionsScreen}
        options={{
          tabBarLabel: 'Actions',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Documents"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconFocused: {
    opacity: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  placeholderTitle: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  placeholderSubtitle: {
    fontSize: fonts.sizes.md,
    color: colors.mid,
  },
});

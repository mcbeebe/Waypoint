/**
 * Bottom tab navigator — 5 main tabs
 * Ported from GAS MVP nav bar (Home, Ask AI, Actions, Calendar, Profile)
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '@/screens/main/HomeScreen';
import NavigatorScreen from '@/screens/main/NavigatorScreen';
import ActionsScreen from '@/screens/main/ActionsScreen';
import CalendarScreen from '@/screens/main/CalendarScreen';
import ProfileScreen from '@/screens/main/ProfileScreen';
import { useI18n } from '@/i18n';
import { colors, fonts } from '@/lib/theme';
import type { MainTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator();

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
  const { t } = useI18n();

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
          tabBarLabel: t.tabs.home,
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="🏠" focused={focused} />,
          tabBarAccessibilityLabel: t.tabs.home,
        }}
      />
      <Tab.Screen
        name="Navigator"
        component={NavigatorScreen}
        options={{
          tabBarLabel: t.tabs.askAi,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon emoji="🧭" focused={focused} />
          ),
          tabBarAccessibilityLabel: t.tabs.askAi,
        }}
      />
      <Tab.Screen
        name="Tracker"
        component={ActionsScreen}
        options={{
          tabBarLabel: t.tabs.actions,
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="📋" focused={focused} />,
          tabBarAccessibilityLabel: t.tabs.actions,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: t.tabs.calendar,
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="📅" focused={focused} />,
          tabBarAccessibilityLabel: t.tabs.calendar,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t.tabs.profile,
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon emoji="👤" focused={focused} />,
          tabBarAccessibilityLabel: t.tabs.profile,
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
});

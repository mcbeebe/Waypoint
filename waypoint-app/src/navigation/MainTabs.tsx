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
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon emoji="🧭" focused={focused} />
          ),
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
});

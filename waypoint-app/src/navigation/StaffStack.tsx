/**
 * Staff-side navigation (PRD W-C) — the facilitation workspace stack. A
 * staff login lands on the caseload and never sees the family tabs.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StaffHomeScreen from '@/screens/staff/StaffHomeScreen';
import CaseDetailScreen from '@/screens/staff/CaseDetailScreen';
import PCPBuilderScreen from '@/screens/staff/PCPBuilderScreen';
import SpendingPlanScreen from '@/screens/staff/SpendingPlanScreen';
import TimeCaptureScreen from '@/screens/staff/TimeCaptureScreen';
import BaselineScreen from '@/screens/staff/BaselineScreen';
import BillingScreen from '@/screens/staff/BillingScreen';
import ScorecardScreen from '@/screens/staff/ScorecardScreen';
import type { StaffStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<StaffStackParamList>();

export default function StaffStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffHome" component={StaffHomeScreen} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
      <Stack.Screen name="PCPBuilder" component={PCPBuilderScreen} />
      <Stack.Screen name="SpendingPlan" component={SpendingPlanScreen} />
      <Stack.Screen name="TimeCapture" component={TimeCaptureScreen} />
      <Stack.Screen name="Baseline" component={BaselineScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="Scorecard" component={ScorecardScreen} />
    </Stack.Navigator>
  );
}

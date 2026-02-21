import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './src/hooks/useAuth';
import { WelcomeScreen } from './src/screens/auth/WelcomeScreen';
import { colors } from './src/lib/theme';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.teal} />
    </View>
  );
}

// Placeholder home — replaced once main tabs are built
function HomeScreen() {
  return (
    <View style={styles.home}>
      <Text style={styles.homeTitle}>Waypoint</Text>
      <Text style={styles.homeSubtitle}>
        Your child's unexpected journey.{'\n'}Every step, mapped.
      </Text>
    </View>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ? (
            <Stack.Screen name="Home" component={HomeScreen} />
          ) : (
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  home: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 32,
  },
  homeTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 8,
  },
  homeSubtitle: {
    fontSize: 15,
    color: colors.mid,
    textAlign: 'center',
    lineHeight: 22,
  },
});

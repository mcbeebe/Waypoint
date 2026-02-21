// Main home screen — placeholder until AI Navigator is built
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../../lib/theme';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>Good morning 👋</Text>
        <Text style={styles.title}>Waypoint</Text>
        <Text style={styles.subtitle}>Your dashboard will appear here</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  greeting: {
    fontSize: fonts.sizes.base,
    color: colors.mid,
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fonts.sizes.md,
    color: colors.mid,
  },
});

/**
 * Health Records screen — Display MyChart data (labs, conditions, meds, allergies)
 * Phase 11: Sprint S80
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  isMyChartConnected,
  connectMyChart,
  disconnectMyChart,
  fetchConditions,
  fetchMedications,
  fetchAllergies,
  fetchLabResults,
  type FHIRCondition,
  type FHIRMedication,
  type FHIRAllergy,
  type FHIRObservation,
} from '@/lib/fhir';
import { useToast } from '@/components/Toast';
import { colors, fonts, spacing, radii } from '@/lib/theme';

type ViewMode = 'overview' | 'labs';

export default function HealthRecordsScreen() {
  const { showToast } = useToast();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const [conditions, setConditions] = useState<FHIRCondition[]>([]);
  const [medications, setMedications] = useState<FHIRMedication[]>([]);
  const [allergies, setAllergies] = useState<FHIRAllergy[]>([]);
  const [labs, setLabs] = useState<FHIRObservation[]>([]);

  const checkAndLoad = useCallback(async () => {
    setLoading(true);
    const isConnected = await isMyChartConnected();
    setConnected(isConnected);

    if (isConnected) {
      try {
        const [conds, meds, algs, lbs] = await Promise.all([
          fetchConditions(), fetchMedications(), fetchAllergies(), fetchLabResults(),
        ]);
        setConditions(conds);
        setMedications(meds);
        setAllergies(algs);
        setLabs(lbs);
      } catch {
        showToast('Failed to load health records', 'error');
      }
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { checkAndLoad(); }, [checkAndLoad]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    const result = await connectMyChart();
    if (result.success) {
      showToast('MyChart connected!', 'success');
      await checkAndLoad();
    } else {
      showToast(result.error ?? 'Connection failed', 'error');
    }
    setConnecting(false);
  }, [showToast, checkAndLoad]);

  const handleDisconnect = useCallback(async () => {
    await disconnectMyChart();
    setConnected(false);
    setConditions([]);
    setMedications([]);
    setAllergies([]);
    setLabs([]);
    showToast('MyChart disconnected', 'success');
  }, [showToast]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Records</Text>
        {connected && (
          <TouchableOpacity onPress={handleDisconnect}>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      {!connected ? (
        <View style={styles.connectContainer}>
          <Text style={styles.connectEmoji}>🏥</Text>
          <Text style={styles.connectTitle}>Connect MyChart</Text>
          <Text style={styles.connectSubtitle}>
            Import your child's medical records, conditions, medications, and lab results from Epic MyChart.
          </Text>
          <Text style={styles.privacyNote}>
            Your health data stays private. Waypoint only reads data you authorize. You can disconnect at any time.
          </Text>
          <TouchableOpacity
            style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.connectButtonText}>Connect MyChart</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.togglePill, viewMode === 'overview' && styles.togglePillActive]}
              onPress={() => setViewMode('overview')}
            >
              <Text style={[styles.toggleText, viewMode === 'overview' && styles.toggleTextActive]}>Overview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.togglePill, viewMode === 'labs' && styles.togglePillActive]}
              onPress={() => setViewMode('labs')}
            >
              <Text style={[styles.toggleText, viewMode === 'labs' && styles.toggleTextActive]}>Labs ({labs.length})</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={checkAndLoad} />}
          >
            {viewMode === 'overview' ? (
              <>
                {/* Conditions */}
                <Text style={styles.sectionTitle}>Conditions ({conditions.length})</Text>
                {conditions.length === 0 ? (
                  <Text style={styles.emptyText}>No conditions found</Text>
                ) : (
                  conditions.map((c) => (
                    <View key={c.id} style={styles.recordCard}>
                      <Text style={styles.recordTitle}>{c.code.text}</Text>
                      {c.code.coding?.[0]?.code && (
                        <Text style={styles.recordCode}>ICD-10: {c.code.coding[0].code}</Text>
                      )}
                      {c.recordedDate && <Text style={styles.recordDate}>Recorded: {c.recordedDate.split('T')[0]}</Text>}
                    </View>
                  ))
                )}

                {/* Medications */}
                <Text style={styles.sectionTitle}>Medications ({medications.length})</Text>
                {medications.length === 0 ? (
                  <Text style={styles.emptyText}>No active medications</Text>
                ) : (
                  medications.map((m) => (
                    <View key={m.id} style={styles.recordCard}>
                      <Text style={styles.recordTitle}>{m.medicationCodeableConcept?.text ?? 'Unknown'}</Text>
                      {m.dosageInstruction?.[0]?.text && (
                        <Text style={styles.recordDetail}>{m.dosageInstruction[0].text}</Text>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: m.status === 'active' ? '#D1FAE5' : colors.light }]}>
                        <Text style={[styles.statusText, { color: m.status === 'active' ? '#059669' : colors.mid }]}>{m.status}</Text>
                      </View>
                    </View>
                  ))
                )}

                {/* Allergies */}
                <Text style={styles.sectionTitle}>Allergies ({allergies.length})</Text>
                {allergies.length === 0 ? (
                  <Text style={styles.emptyText}>No known allergies</Text>
                ) : (
                  allergies.map((a) => (
                    <View key={a.id} style={styles.recordCard}>
                      <Text style={styles.recordTitle}>{a.code.text}</Text>
                      {a.criticality && (
                        <View style={[styles.statusBadge, { backgroundColor: a.criticality === 'high' ? '#FEE2E2' : '#FEF3C7' }]}>
                          <Text style={[styles.statusText, { color: a.criticality === 'high' ? '#DC2626' : '#D97706' }]}>
                            {a.criticality} criticality
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                {/* Lab Results */}
                {labs.length === 0 ? (
                  <Text style={styles.emptyText}>No lab results available</Text>
                ) : (
                  labs.map((l) => (
                    <View key={l.id} style={styles.labCard}>
                      <View style={styles.labHeader}>
                        <Text style={styles.labName}>{l.code.text}</Text>
                        <Text style={styles.labDate}>{l.effectiveDateTime?.split('T')[0] ?? ''}</Text>
                      </View>
                      <View style={styles.labValueRow}>
                        <Text style={styles.labValue}>
                          {l.valueQuantity ? `${l.valueQuantity.value} ${l.valueQuantity.unit}` : l.valueString ?? 'N/A'}
                        </Text>
                        {l.referenceRange?.[0] && (
                          <Text style={styles.labRange}>
                            Ref: {l.referenceRange[0].low?.value ?? '?'}–{l.referenceRange[0].high?.value ?? '?'} {l.referenceRange[0].high?.unit ?? ''}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  disconnectText: { fontSize: fonts.sizes.xs, color: '#DC2626' },
  connectContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  connectEmoji: { fontSize: 56, marginBottom: spacing.md },
  connectTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  connectSubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, textAlign: 'center', lineHeight: 22, marginBottom: spacing.md },
  privacyNote: { fontSize: fonts.sizes.xs, color: '#1E40AF', backgroundColor: '#EFF6FF', padding: spacing.md, borderRadius: radii.md, lineHeight: 16, marginBottom: spacing.lg, textAlign: 'center' },
  connectButton: { backgroundColor: '#2563EB', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.md },
  connectButtonDisabled: { backgroundColor: colors.border },
  connectButtonText: { fontSize: fonts.sizes.md, color: colors.white, fontWeight: fonts.weights.bold as '700' },
  toggleRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 },
  togglePill: { flex: 1, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.light, alignItems: 'center' },
  togglePillActive: { backgroundColor: colors.teal },
  toggleText: { fontSize: 12, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  toggleTextActive: { color: colors.white },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm, marginTop: spacing.md },
  emptyText: { fontSize: fonts.sizes.sm, color: colors.mid, fontStyle: 'italic', marginBottom: spacing.md },
  recordCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  recordTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.dark },
  recordCode: { fontSize: fonts.sizes.xs, color: colors.teal, marginTop: 2 },
  recordDate: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  recordDetail: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.sm, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: fonts.weights.medium as '500' },
  labCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  labHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  labName: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.dark, flex: 1 },
  labDate: { fontSize: fonts.sizes.xs, color: colors.mid },
  labValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labValue: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  labRange: { fontSize: fonts.sizes.xs, color: colors.mid },
});

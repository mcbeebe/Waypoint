/**
 * Email Analyzer — Phase 3 Communication Suite (ported from GAS analyzeEmailAI).
 * Paste an email from a school / Regional Center / insurer; Waypoint explains
 * what it really says, flags problems, and lists deadlines and next steps.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFamily } from '@/hooks/useFamily';
import { useToast } from '@/components/Toast';
import AIConsentModal from '@/components/AIConsentModal';
import Button from '@/components/Button';
import { analyzeEmail, type EmailAnalysis } from '@/lib/letters';
import { useI18n } from '@/i18n';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const SEVERITY_COLORS: Record<string, string> = {
  high: colors.error,
  medium: '#F59E0B',
  low: colors.mid,
};

export default function EmailAnalyzerScreen() {
  const navigation = useNavigation();
  const { family, updateFamily } = useFamily();
  const { showToast } = useToast();
  const { locale } = useI18n();
  const hasAIConsent = !!family?.ai_consent_at;

  const [emailText, setEmailText] = useState('');
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!emailText.trim()) {
      showToast('Paste the email text first.', 'error');
      return;
    }
    if (!hasAIConsent) {
      setShowConsent(true);
      return;
    }
    setAnalyzing(true);
    const result = await analyzeEmail(
      emailText.trim(),
      locale !== 'en' ? locale : undefined
    );
    setAnalyzing(false);
    if (result.error === 'consent_required') {
      setShowConsent(true);
      return;
    }
    if (!result.analysis) {
      showToast(result.error ?? 'Could not analyze the email — please try again.', 'error');
      return;
    }
    setAnalysis(result.analysis);
  }, [emailText, hasAIConsent, locale, showToast]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <AIConsentModal
        visible={showConsent}
        onAccept={async () => {
          setShowConsent(false);
          await updateFamily({ ai_consent_at: new Date().toISOString() });
        }}
        onDecline={() => setShowConsent(false)}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!analysis ? (
          <>
            <Text style={styles.intro}>
              Got a confusing email from the school, Regional Center, or insurance? Paste it below.
              Waypoint translates the bureaucracy, flags anything off, and tells you what to do next.
            </Text>
            <TextInput
              style={styles.emailInput}
              value={emailText}
              onChangeText={setEmailText}
              placeholder="Paste the full email here…"
              placeholderTextColor={colors.mid}
              multiline
              textAlignVertical="top"
            />
            <Button
              title={analyzing ? 'Analyzing…' : 'Analyze Email'}
              onPress={handleAnalyze}
              variant="primary"
              loading={analyzing}
              disabled={analyzing}
            />
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setAnalysis(null)}
              accessibilityRole="button"
            >
              <Text style={styles.backLink}>‹ Analyze another email</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>What this email is saying</Text>
              <Text style={styles.bodyText}>{analysis.summary}</Text>
              <Text style={styles.toneText}>
                Tone: {analysis.tone_assessment}
              </Text>
            </View>

            {analysis.red_flags?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🚩 Red flags</Text>
                {analysis.red_flags.map((f, i) => (
                  <View key={i} style={styles.flagRow}>
                    <View
                      style={[
                        styles.severityDot,
                        { backgroundColor: SEVERITY_COLORS[f.severity] ?? colors.mid },
                      ]}
                    />
                    <View style={styles.flagBody}>
                      <Text style={styles.bodyText}>{f.flag}</Text>
                      {f.law_cited ? (
                        <Text style={styles.lawText}>{f.law_cited}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {analysis.action_items?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>✅ What to do</Text>
                {analysis.action_items.map((a, i) => (
                  <View key={i} style={styles.actionItem}>
                    <Text style={styles.bodyText}>• {a.action}</Text>
                    {a.deadline ? (
                      <Text style={styles.deadlineText}>Deadline: {a.deadline}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {analysis.rights_at_stake?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>⚖️ Rights at stake</Text>
                {analysis.rights_at_stake.map((r, i) => (
                  <Text key={i} style={styles.bodyText}>• {r}</Text>
                ))}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>How to respond</Text>
              <Text style={styles.bodyText}>{analysis.suggested_response}</Text>
              {analysis.offer_to_draft ? (
                <Button
                  title="Draft a response with Waypoint"
                  onPress={() => (navigation as any).navigate('Letters')}
                  variant="primary"
                />
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  intro: { fontSize: fonts.sizes.base, color: colors.mid, lineHeight: 20 },
  emailInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fonts.sizes.base,
    color: colors.dark,
    minHeight: 220,
  },
  backLink: {
    fontSize: fonts.sizes.base,
    color: colors.teal,
    fontWeight: '600',
    paddingVertical: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  bodyText: { fontSize: fonts.sizes.base, color: colors.dark, lineHeight: 20 },
  toneText: { fontSize: fonts.sizes.sm, color: colors.mid, fontStyle: 'italic' },
  flagRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  severityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  flagBody: { flex: 1 },
  lawText: { fontSize: fonts.sizes.xs, color: colors.teal },
  actionItem: { gap: 2 },
  deadlineText: {
    fontSize: fonts.sizes.sm,
    color: colors.error,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
});

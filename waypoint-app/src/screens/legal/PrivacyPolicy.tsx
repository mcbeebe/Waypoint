/**
 * Privacy Policy screen — static legal content
 * Required for App Store submission (Apple guideline 5.1.1)
 */

import React from 'react';
import { ScrollView, Text, View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const EFFECTIVE_DATE = 'March 13, 2026';
const CONTACT_EMAIL = 'privacy@waypointfamilies.com';

export default function PrivacyPolicy() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.effective}>Effective Date: {EFFECTIVE_DATE}</Text>

        <Section title="1. Who We Are">
          <P>
            Waypoint (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a mobile application designed to help
            California families of children with disabilities navigate services, understand their
            rights, and manage action plans. This Privacy Policy explains how we collect, use, and
            protect your personal information.
          </P>
        </Section>

        <Section title="2. Information We Collect">
          <P>We collect only the information necessary to provide our services:</P>
          <Bullet>Account information: name, email address (via Apple Sign-In or Google Sign-In)</Bullet>
          <Bullet>Family profile: child&apos;s first name, date of birth, diagnoses, state, county, Regional Center, school district, and insurance carrier</Bullet>
          <Bullet>Chat conversations: messages you exchange with the AI Navigator</Bullet>
          <Bullet>Action plans and deadlines you create or save from chat</Bullet>
          <Bullet>Documents you upload (IEPs, evaluations, medical records)</Bullet>
          <Bullet>Device information: device type, operating system version, and crash reports (via Sentry)</Bullet>
        </Section>

        <Section title="3. How We Use Your Information">
          <Bullet>To personalize AI Navigator responses with context about your child and situation</Bullet>
          <Bullet>To maintain your action plan, deadlines, and document vault</Bullet>
          <Bullet>To send deadline reminders and notifications you opt into</Bullet>
          <Bullet>To improve our service quality and fix technical issues</Bullet>
          <P>
            We do NOT sell, rent, or share your personal information with third parties for marketing
            purposes. Ever.
          </P>
        </Section>

        <Section title="4. AI and Data Processing">
          <P>
            Our AI Navigator uses Anthropic&apos;s Claude API to generate personalized guidance. When you
            send a message, we transmit your query and relevant family context to Anthropic&apos;s API for
            processing. Anthropic does not use your data to train their models. We also use OpenAI&apos;s
            embedding API to match your questions with our knowledge base articles. No personally
            identifiable information is included in embedding requests.
          </P>
        </Section>

        <Section title="5. Data Storage and Security">
          <Bullet>All data is stored in Supabase (hosted on AWS) with encryption at rest and in transit</Bullet>
          <Bullet>API keys are stored server-side in Supabase Edge Functions and never included in the app bundle</Bullet>
          <Bullet>Row-level security ensures you can only access your own family&apos;s data</Bullet>
          <Bullet>Authentication is handled via Supabase Auth with secure token management</Bullet>
          <Bullet>Sensitive credentials are stored in the device&apos;s secure enclave via expo-secure-store</Bullet>
        </Section>

        <Section title="6. Data Retention">
          <P>
            We retain your data for as long as your account is active. You may request deletion of
            your account and all associated data at any time by contacting us. Upon deletion request,
            we will remove your data within 30 days, except where retention is required by law.
          </P>
        </Section>

        <Section title="7. Children&apos;s Privacy">
          <P>
            Waypoint is used by parents and guardians, not directly by children. We collect children&apos;s
            first names, dates of birth, and diagnoses solely to personalize guidance for their parents.
            We do not knowingly collect data directly from children under 13. If you believe a child
            has provided us with personal information, please contact us immediately.
          </P>
        </Section>

        <Section title="8. Your Rights">
          <P>You have the right to:</P>
          <Bullet>Access all personal data we hold about you</Bullet>
          <Bullet>Request correction of inaccurate data</Bullet>
          <Bullet>Request deletion of your account and data</Bullet>
          <Bullet>Export your data in a portable format</Bullet>
          <Bullet>Opt out of non-essential notifications</Bullet>
          <P>
            California residents have additional rights under the CCPA, including the right to know
            what personal information is collected and the right to non-discrimination for exercising
            privacy rights.
          </P>
        </Section>

        <Section title="9. Third-Party Services">
          <P>We use the following third-party services:</P>
          <Bullet>Supabase: Database and authentication (supabase.com)</Bullet>
          <Bullet>Anthropic: AI-powered guidance (anthropic.com)</Bullet>
          <Bullet>OpenAI: Knowledge base search embeddings (openai.com)</Bullet>
          <Bullet>Sentry: Crash reporting and error tracking (sentry.io)</Bullet>
          <Bullet>Apple/Google: Authentication providers</Bullet>
          <P>Each third-party service is governed by its own privacy policy.</P>
        </Section>

        <Section title="10. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes through the app or via email. Your continued use after changes constitutes
            acceptance of the updated policy.
          </P>
        </Section>

        <Section title="11. Contact Us">
          <P>
            If you have questions about this Privacy Policy or your data, contact us at:
          </P>
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            accessibilityRole="link"
            accessibilityLabel={`Email ${CONTACT_EMAIL}`}
          >
            <Text style={styles.link}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Reusable sub-components ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{'\u2022'}</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  effective: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: spacing.md,
    marginBottom: 4,
  },
  bulletDot: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 20,
  },
  link: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    textDecorationLine: 'underline',
    marginTop: spacing.xs,
  },
});

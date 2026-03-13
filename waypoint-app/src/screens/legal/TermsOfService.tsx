/**
 * Terms of Service screen — static legal content
 * Required for App Store submission (Apple guideline 5.1.1)
 */

import React from 'react';
import { ScrollView, Text, View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@/lib/theme';

const EFFECTIVE_DATE = 'March 13, 2026';
const CONTACT_EMAIL = 'legal@waypointfamilies.com';

export default function TermsOfService() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.effective}>Effective Date: {EFFECTIVE_DATE}</Text>

        <Section title="1. Acceptance of Terms">
          <P>
            By downloading, installing, or using Waypoint (&quot;the App&quot;), you agree to be bound by
            these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the
            App.
          </P>
        </Section>

        <Section title="2. Description of Service">
          <P>
            Waypoint provides AI-powered guidance to help California families of children with
            disabilities navigate services, understand their rights, and manage action plans. The
            App includes an AI Navigator chat feature, action plan tracking, document management,
            calendar and deadline management, and resource information.
          </P>
        </Section>

        <Section title="3. Important Disclaimer — Not Legal or Medical Advice">
          <P>
            THE INFORMATION PROVIDED BY WAYPOINT IS FOR GENERAL INFORMATIONAL PURPOSES ONLY.
            Waypoint is NOT a law firm, does NOT provide legal advice, and is NOT a substitute for
            the advice of a qualified attorney, advocate, or medical professional.
          </P>
          <P>
            While we strive for accuracy regarding California disability law (including the Lanterman
            Act, IDEA, ADA, and Medi-Cal), laws and regulations change. You should always verify
            information with qualified professionals before taking legal or medical action.
          </P>
          <P>
            The AI Navigator provides personalized guidance based on your situation and our
            knowledge base, but its responses may contain errors or omissions. Always use your own
            judgment and consult appropriate professionals for important decisions.
          </P>
        </Section>

        <Section title="4. User Accounts">
          <Bullet>You must be at least 18 years old to create an account</Bullet>
          <Bullet>You are responsible for maintaining the security of your account</Bullet>
          <Bullet>You agree to provide accurate information during registration and onboarding</Bullet>
          <Bullet>You may not share your account with others or create multiple accounts</Bullet>
          <Bullet>We reserve the right to suspend or terminate accounts that violate these Terms</Bullet>
        </Section>

        <Section title="5. Acceptable Use">
          <P>You agree NOT to:</P>
          <Bullet>Use the App for any unlawful purpose</Bullet>
          <Bullet>Attempt to reverse-engineer, decompile, or extract source code from the App</Bullet>
          <Bullet>Use automated systems (bots, scrapers) to access the App</Bullet>
          <Bullet>Upload malicious files or content that could harm other users</Bullet>
          <Bullet>Misrepresent your identity or relationship to a child</Bullet>
          <Bullet>Use the AI Navigator to generate fraudulent documentation</Bullet>
        </Section>

        <Section title="6. Intellectual Property">
          <P>
            All content, features, and functionality of the App — including but not limited to text,
            graphics, logos, knowledge base articles, AI prompts, and software code — are owned by
            Waypoint and protected by intellectual property laws.
          </P>
          <P>
            You retain ownership of all personal data, documents, and content you upload to the
            App. By uploading content, you grant us a limited license to store, process, and display
            it within the App as needed to provide our services.
          </P>
        </Section>

        <Section title="7. AI-Generated Content">
          <P>
            Responses from the AI Navigator are generated using artificial intelligence and may not
            always be accurate, complete, or current. AI-generated content should be treated as
            informational guidance, not as professional advice. We make no warranties regarding
            the accuracy, completeness, or reliability of AI-generated responses.
          </P>
        </Section>

        <Section title="8. Document Storage">
          <P>
            Waypoint allows you to upload and store documents (IEPs, evaluations, medical records,
            etc.). While we implement security measures to protect your documents, you acknowledge
            that no system is completely secure. You are responsible for maintaining your own backup
            copies of important documents.
          </P>
        </Section>

        <Section title="9. Limitation of Liability">
          <P>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WAYPOINT SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
            LIMITED TO LOSS OF SERVICES, MISSED DEADLINES, OR DENIED BENEFITS, ARISING FROM YOUR
            USE OF THE APP.
          </P>
          <P>
            Our total liability for any claims arising from your use of the App shall not exceed
            the amount you paid us in the twelve (12) months preceding the claim, or $100,
            whichever is greater.
          </P>
        </Section>

        <Section title="10. Indemnification">
          <P>
            You agree to indemnify and hold Waypoint harmless from any claims, damages, or
            expenses arising from your violation of these Terms, your use of the App, or your
            reliance on information provided through the App.
          </P>
        </Section>

        <Section title="11. Service Availability">
          <P>
            We strive to maintain the App&apos;s availability but do not guarantee uninterrupted
            access. We may modify, suspend, or discontinue features at any time with reasonable
            notice. We are not liable for any service interruptions.
          </P>
        </Section>

        <Section title="12. Changes to Terms">
          <P>
            We may update these Terms from time to time. Material changes will be communicated
            through the App or via email. Your continued use of the App after changes constitutes
            acceptance. If you disagree with updated Terms, you should discontinue use and request
            account deletion.
          </P>
        </Section>

        <Section title="13. Governing Law">
          <P>
            These Terms are governed by the laws of the State of California, without regard to
            conflict of law principles. Any disputes shall be resolved in the courts of California.
          </P>
        </Section>

        <Section title="14. Contact Us">
          <P>
            If you have questions about these Terms, contact us at:
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

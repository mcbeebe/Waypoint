/**
 * Join a family (Family Sharing B3) — where a tokenised invite link lands.
 *
 * Root-level and reachable BEFORE onboarding on purpose: a co-parent who
 * signs up from the link must never be pushed into "create your own family".
 * The screen previews the invite (who, as what role, is this the right
 * account) and then calls the one guarded door — `accept_family_invitation`
 * (migration 054) — which does every check server-side. The states here are
 * the four in the 007 mockups plus loading.
 *
 * Tone: a welcome, not a demand (escalation-tone rule). Copy stays warm in
 * every state, including the ones where the link does not work.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Brandmark } from '@/components/Brandmark';
import Button from '@/components/Button';
import { isInviteError, joinStateFromError, joinStateFromPreview } from '@/lib/joinInvite';
import type { JoinState } from '@/lib/joinInvite';
import { brand, fonts, radii, spacing } from '@/lib/theme';

interface Props {
  token: string;
  /** Accepted — the caller re-resolves the family and moves on. */
  onDone: () => void;
  /** "Not now" or a dead link — the caller drops the pending token. */
  onNotNow: () => void;
}

interface Preview {
  inviterName: string;
  role: string;
  emailMatches: boolean;
  emailVerified: boolean;
  emailHint: string;
}

/** A hung preview must not strand the person on a spinner with no button. */
const PREVIEW_TIMEOUT_MS = 12_000;

export default function JoinFamilyScreen({ token, onDone, onNotNow }: Props) {
  const [state, setState] = useState<JoinState | 'loading'>('loading');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [me, setMe] = useState<string>('');
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setAcceptError(null);
    setState('loading');
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setState((s) => (s === 'loading' ? 'unavailable' : s)); }, PREVIEW_TIMEOUT_MS);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled) setMe(user?.email ?? '');
      const { data, error } = await supabase.rpc('preview_family_invitation', { p_token: token });
      if (cancelled) return;
      clearTimeout(timer);
      if (error) {
        // An infrastructure failure (offline, or migration 054 not applied)
        // is "couldn't check right now", never a false "revoked".
        setState(isInviteError(error.message) ? joinStateFromError(error.message) : 'unavailable');
        return;
      }
      const p = (data ?? {}) as Record<string, unknown>;
      const next = joinStateFromPreview(p.state);
      setPreview({
        inviterName: typeof p.inviter_name === 'string' && p.inviter_name ? p.inviter_name : 'A parent',
        role: typeof p.role === 'string' ? p.role : 'member',
        emailMatches: p.email_matches === true,
        emailVerified: p.email_verified !== false,
        emailHint: typeof p.invitee_email_hint === 'string' ? p.invitee_email_hint : '',
      });
      if (next === 'pending' && p.email_matches !== true) {
        setState('email_mismatch');       // right token, wrong signed-in address
      } else if (next === 'pending' && p.email_verified === false) {
        setState('email_unverified');     // right address, not yet confirmed
      } else {
        setState(next);
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [token, attempt]);

  const accept = useCallback(async () => {
    setAccepting(true);
    setAcceptError(null);
    const { error } = await supabase.rpc('accept_family_invitation', { p_token: token });
    setAccepting(false);
    if (error) {
      // A mapped state gets its own screen; an infrastructure failure stays
      // on the pending screen with an inline, retryable message.
      if (!isInviteError(error.message)) {
        setAcceptError("Couldn't join just now — please try again.");
        return;
      }
      setState(joinStateFromError(error.message));
      return;
    }
    onDone();
  }, [token, onDone]);

  const inviter = preview?.inviterName ?? 'A parent';
  const roleLabel = preview?.role === 'viewer' ? 'Viewer' : preview?.role === 'admin' ? 'Admin' : 'Member';
  const roleLine =
    preview?.role === 'viewer'
      ? `You're joining as a Viewer — you can see the plan, but only ${inviter} can change it.`
      : `You're joining as a Member — you can see the plan and help keep it moving.`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Brandmark size={20} />
        <Text style={styles.headerTitle}>Join a family</Text>
      </View>

      {state === 'loading' ? (
        <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Checking your invitation">
          <ActivityIndicator size="large" color={brand.pine} />
        </View>
      ) : state === 'pending' ? (
        <>
          <View style={styles.hero}>
            <View style={styles.mark}>
              <Brandmark size={64} route />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {inviter} invited you to their Waypoint family
            </Text>
            <Text style={styles.sub}>
              You'll be able to see and help with their family's plan, calendar, and documents —
              everything they're working on, in one place.
            </Text>
            <View style={styles.roleCard}>
              <Text style={styles.roleText}>{roleLine}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            {acceptError ? <Text style={styles.errorText}>{acceptError}</Text> : null}
            <Button
              title={`Accept & join ${inviter}'s family`}
              onPress={accept}
              variant="primary"
              loading={accepting}
              disabled={accepting}
            />
            <Pressable
              onPress={onNotNow}
              disabled={accepting}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              style={styles.notNow}
            >
              <Text style={styles.notNowText}>Not now</Text>
            </Pressable>
            {!!me && <Text style={styles.signedIn}>Signed in as {me}</Text>}
            <Text style={styles.roleBadgeHint}>Invited as {roleLabel}</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.hero}>
            <View style={[styles.stateCard, state === 'expired' || state === 'not_found' || state === 'already_used' ? styles.stateCardWarm : null]}>
              <Text style={styles.stateTitle} accessibilityRole="header">
                {state === 'expired' && 'This invite has expired'}
                {state === 'joined' && "You're already on this family"}
                {state === 'already_used' && 'This invite was already used'}
                {state === 'email_mismatch' && 'This invite is for a different email'}
                {state === 'email_unverified' && 'Confirm your email first'}
                {state === 'not_found' && "This link doesn't work"}
                {state === 'not_signed_in' && 'Sign in to join'}
                {state === 'unavailable' && "Couldn't check this invite right now"}
              </Text>
              <Text style={styles.stateBody}>
                {state === 'expired' &&
                  `Join links last 14 days. Ask ${inviter} to send a fresh one from Family Sharing.`}
                {state === 'joined' &&
                  'This invite was already accepted by you. Open the app to see the family’s plan.'}
                {state === 'already_used' &&
                  `Someone has already joined with this link. If that wasn't you, ask ${inviter} to send a fresh one.`}
                {state === 'email_mismatch' &&
                  `It was sent to ${preview?.emailHint || 'another address'}. Sign in with that address, or ask ${inviter} to re-invite the one you use.`}
                {state === 'email_unverified' &&
                  `This is the right address — it just isn't confirmed yet. Open the confirmation email we sent to ${me || 'you'}, then tap the invite again.`}
                {state === 'not_found' &&
                  'It may have been revoked, or the link was copied incompletely. Ask the person who invited you to send it again.'}
                {state === 'not_signed_in' &&
                  "Create a free account or sign in — we'll bring you right back here to accept."}
                {state === 'unavailable' &&
                  'Waypoint could not reach the server, or the invite service is not ready yet. Your link is safe — try again in a moment.'}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            {(state === 'unavailable' || state === 'email_unverified') && (
              <Button title="Try again" onPress={retry} variant="primary" />
            )}
            <Button
              title={state === 'joined' ? 'Open Waypoint' : 'Back to Waypoint'}
              onPress={state === 'joined' ? onDone : onNotNow}
              variant={state === 'unavailable' || state === 'email_unverified' ? 'outline' : 'primary'}
            />
            {!!me && <Text style={styles.signedIn}>Signed in as {me}</Text>}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.paper },
  header: {
    backgroundColor: brand.headerTop,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: fonts.weights.bold as '700', color: brand.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  mark: { marginTop: spacing.xl, marginBottom: spacing.base },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fonts.weights.extrabold as '800',
    color: brand.ink,
    textAlign: 'center',
  },
  sub: { fontSize: 15, lineHeight: 23, color: brand.inkSoft, textAlign: 'center', marginTop: 6 },
  roleCard: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    backgroundColor: brand.panel,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  roleText: { fontSize: 13, lineHeight: 18, color: brand.inkSoft },
  actions: { paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'], paddingTop: spacing.lg, gap: spacing.md },
  notNow: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  notNowText: { fontSize: 15, fontWeight: fonts.weights.semibold as '600', color: brand.inkFaint },
  signedIn: { textAlign: 'center', fontSize: 12, color: brand.inkFaint },
  roleBadgeHint: { textAlign: 'center', fontSize: 12, color: brand.inkFaint },
  errorText: { fontSize: fonts.sizes.sm, color: brand.urgent, textAlign: 'center', lineHeight: 18 },
  stateCard: {
    marginTop: spacing['2xl'],
    alignSelf: 'stretch',
    backgroundColor: brand.panel,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    padding: spacing.base,
    gap: 4,
  },
  stateCardWarm: { backgroundColor: brand.urgentTint },
  stateTitle: { fontSize: 15, fontWeight: fonts.weights.bold as '700', color: brand.ink },
  stateBody: { fontSize: 13, lineHeight: 19, color: brand.inkSoft },
});

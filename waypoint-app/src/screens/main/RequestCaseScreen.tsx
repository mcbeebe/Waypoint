/**
 * Request Case File (Roadmap/Request-Case-File-Plan.md) — one request, one
 * thread, one honest clock. Everything about a single ask lives here: the
 * statutory deadline, the escalation rung, every letter/call/reply on the
 * thread with its provenance shown, and exactly one next move.
 *
 * Data honesty: the thread is fetched scoped to this request (request_id +
 * origin letter + full Gmail threads), so it never loses items to the
 * family-wide paper-trail fetch limit. Ordering and provenance come from
 * lib/requestCase (the eventAt rule) — never recomputed here.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useRequests, type FamilyRequest } from '@/hooks/useRequests';
import {
  logCommunication,
  isMissingRequestIdColumn,
  type Communication,
} from '@/hooks/useCommunications';
import {
  buildRequestCase,
  eventAt,
  type CaseEvent,
  type CaseStage,
  type ProvenanceTier,
} from '@/lib/requestCase';
import { REQUEST_TYPE_LABELS } from '@/lib/requestClocks';
import { exportRequestDossier } from '@/lib/requestDossier';
import { gmailStatus } from '@/lib/gmail';
import GmailReplyModal from '@/components/GmailReplyModal';
import AddEntryModal, { KIND_CONFIG, ORG_LABELS } from '@/components/AddEntryModal';
import { useToast } from '@/components/Toast';
import { toFunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import type { HomeStackParamList } from '@/types/navigation';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const STATUS_CYCLE: Record<FamilyRequest['status'], FamilyRequest['status']> = {
  requested: 'in_progress',
  in_progress: 'granted',
  granted: 'denied',
  denied: 'requested',
  withdrawn: 'requested',
};

const STATUS_STYLE: Record<FamilyRequest['status'], { bg: string; fg: string; label: string }> = {
  requested: { bg: semantic.infoBg, fg: semantic.info, label: 'Requested' },
  in_progress: { bg: semantic.warningBg, fg: semantic.warning, label: 'In progress' },
  granted: { bg: semantic.successBg, fg: semantic.success, label: 'Granted ✓' },
  denied: { bg: semantic.dangerBg, fg: semantic.danger, label: 'Denied' },
  withdrawn: { bg: colors.light, fg: colors.mid, label: 'Withdrawn' },
};

const PROVENANCE_CHIP: Record<ProvenanceTier, { label: string; bg: string; fg: string }> = {
  gmail: { label: 'Gmail · dated', bg: '#E0F2FE', fg: '#0369A1' },
  contemporaneous: { label: 'Logged promptly', bg: '#D1FAE5', fg: '#047857' },
  recalled: { label: 'From memory', bg: '#FEF3C7', fg: '#92400E' },
};

const STAGE_LABELS: Array<{ stage: CaseStage; num: number; label: string }> = [
  { stage: 'ask', num: 1, label: 'Ask' },
  { stage: 'follow_up', num: 2, label: 'Follow up' },
  { stage: 'formal', num: 3, label: 'Formal' },
];

const STAGE_ORDER: Record<CaseStage, number> = { ask: 1, follow_up: 2, formal: 3 };

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface CaseFetchResult {
  rows: Communication[];
  /** A real failure (network, RLS, 5xx) — the record may be incomplete. */
  failed: boolean;
  /** The 047 column is missing: the app degrades honestly, not broken. */
  pre047: boolean;
}

/**
 * Every communication this case may touch, without the family-wide fetch
 * cap: explicit request_id rows, the origin letter, then the FULL contents
 * of any Gmail thread those touch (other requests' rows included — the
 * ambiguity guard in threadFor needs to see them). A pre-047 database is
 * expected and fine; anything else that errors is reported, never shown as
 * a confidently empty record.
 */
async function fetchCaseCommunications(
  familyId: string,
  request: FamilyRequest
): Promise<CaseFetchResult> {
  const byId = new Map<string, Communication>();
  let failed = false;
  let pre047 = false;
  const collect = (rows: Communication[] | null | undefined) => {
    for (const r of rows ?? []) byId.set(r.id, r);
  };
  const { data: linked, error } = await supabase
    .from('communications')
    .select('*')
    .eq('family_id', familyId)
    .eq('request_id', request.id);
  if (error) {
    if (isMissingRequestIdColumn(error.message)) pre047 = true;
    else failed = true;
  } else {
    collect(linked as Communication[]);
  }
  if (request.communication_id && !byId.has(request.communication_id)) {
    const { data: origin, error: originError } = await supabase
      .from('communications')
      .select('*')
      .eq('family_id', familyId)
      .eq('id', request.communication_id)
      .maybeSingle();
    if (originError) failed = true;
    if (origin) collect([origin as Communication]);
  }
  const threadIds = [
    ...new Set(
      [...byId.values()].map((c) => c.gmail_thread_id).filter((t): t is string => !!t)
    ),
  ];
  if (threadIds.length > 0) {
    const { data: threadRows, error: threadError } = await supabase
      .from('communications')
      .select('*')
      .eq('family_id', familyId)
      .in('gmail_thread_id', threadIds);
    if (threadError) failed = true;
    collect(threadRows as Communication[]);
  }
  return { rows: [...byId.values()], failed, pre047 };
}

export default function RequestCaseScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, 'RequestCase'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { requestId } = route.params;
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const primaryChild = children.find((c) => c.is_primary) ?? children[0];
  const {
    requests,
    loading: requestsLoading,
    updateStatus,
    refetch: refetchRequests,
  } = useRequests(family?.id);
  const { showToast } = useToast();
  const { locale } = useI18n();
  const funnelLocale = toFunnelLocale(locale);

  const request = requests.find((r) => r.id === requestId) ?? null;

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pre047, setPre047] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [replyThread, setReplyThread] = useState<Communication[] | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') gmailStatus().then((s) => setGmailConnected(s.gmail));
  }, []);

  // Keyed on stable ids (not the request object), so refetches that produce
  // fresh row identities don't retrigger this and loop.
  const requestRef = React.useRef(request);
  requestRef.current = request;
  const load = useCallback(async () => {
    const r = requestRef.current;
    if (!family?.id || !r) return;
    const result = await fetchCaseCommunications(family.id, r);
    setCommunications(result.rows);
    setLoadFailed(result.failed);
    setPre047(result.pre047);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id, requestId]);

  // Refetch on every focus: sending the lever letter this screen prescribed
  // (or replying in the Paper Trail) must be visible the moment the parent
  // comes back — a stale case re-offers the send it just caused.
  useFocusEffect(
    useCallback(() => {
      load();
      refetchRequests();
    }, [load, refetchRequests])
  );

  // First load can outrun useRequests: run again the moment the row arrives.
  const requestFound = !!request;
  useEffect(() => {
    if (requestFound) load();
  }, [requestFound, load]);

  const kase = useMemo(
    () => (request ? buildRequestCase(request, communications, funnelLocale) : null),
    [request, communications, funnelLocale]
  );

  const openReply = useCallback(
    (reply: Communication) => {
      if (!reply.gmail_thread_id || !gmailConnected) {
        // No Gmail on this platform/session — the Paper Trail screen owns
        // the connect flow; hand the reply over instead of dead-ending.
        navigation.navigate('CommunicationLog', { openReplyId: reply.id });
        return;
      }
      const thread = communications
        .filter((c) => c.gmail_thread_id === reply.gmail_thread_id)
        .sort((a, b) => eventAt(a).localeCompare(eventAt(b)));
      setReplyThread(thread.length > 0 ? thread : [reply]);
    },
    [communications, gmailConnected, navigation]
  );

  if (!request) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          {requestsLoading ? 'Loading this request…' : 'This request is no longer tracked.'}
        </Text>
      </View>
    );
  }

  const s = STATUS_STYLE[request.status];
  const deadline = kase?.deadline ?? null;
  const events: CaseEvent[] = kase?.events ?? [];
  const open = request.status === 'requested' || request.status === 'in_progress';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Case header */}
      <View style={styles.card}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{request.title}</Text>
            <Text style={styles.meta}>{REQUEST_TYPE_LABELS[request.request_type]}</Text>
            {kase && <Text style={styles.provenanceLine}>{kase.provenanceLine}</Text>}
          </View>
          <Pressable
            style={[styles.statusChip, { backgroundColor: s.bg }]}
            onPress={async () => {
              const ok = await updateStatus(request.id, STATUS_CYCLE[request.status]);
              if (!ok) showToast("Couldn't update the status — try again.", 'error');
            }}
            accessibilityRole="button"
            accessibilityLabel={`Status: ${s.label}. Tap to change.`}
          >
            <Text style={[styles.statusChipText, { color: s.fg }]}>{s.label}</Text>
          </Pressable>
        </View>

        {/* The honest clock */}
        {open && deadline && (
          <View
            style={[styles.clockChip, deadline.overdue ? styles.clockOverdue : styles.clockRunning]}
          >
            <Text
              style={[
                styles.clockText,
                deadline.overdue ? styles.clockTextOverdue : styles.clockTextRunning,
              ]}
            >
              {deadline.overdue
                ? `⚠ ${-deadline.daysRemaining} days past the legal deadline (${deadline.dueOn})`
                : `⏱ Due ${deadline.dueOn} · ${deadline.daysRemaining} days left`}{' '}
              · {deadline.citation}
            </Text>
            {kase?.backdated && (
              <Text style={styles.clockNote}>
                The clock runs from the day you asked — not the day it was logged.
              </Text>
            )}
          </View>
        )}
        {open && !deadline && (
          <Text style={styles.noClock}>
            No legal deadline on this one — your written record is the pressure.
          </Text>
        )}

        {/* Rung strip — where this ask stands on the ladder */}
        <View style={styles.rungStrip}>
          {STAGE_LABELS.map((r, i) => {
            const reached = kase ? STAGE_ORDER[kase.stage] >= r.num : r.num === 1;
            const current = kase?.stage === r.stage;
            return (
              <React.Fragment key={r.stage}>
                {i > 0 && <View style={[styles.rungLine, reached && styles.rungLineReached]} />}
                <View style={[styles.rungDot, reached && styles.rungDotReached, current && styles.rungDotCurrent]}>
                  <Text style={[styles.rungNum, reached && styles.rungNumReached]}>{r.num}</Text>
                </View>
                <Text style={[styles.rungLabel, current && styles.rungLabelCurrent]}>{r.label}</Text>
              </React.Fragment>
            );
          })}
        </View>
        {kase?.daysSilent != null && kase.daysSilent >= 1 && (
          <Text style={styles.silenceLine}>
            🤫 {kase.daysSilent} {kase.daysSilent === 1 ? 'day' : 'days'} since your last message
            with no answer
          </Text>
        )}
      </View>

      {/* They replied — the one thing to do right now */}
      {kase?.unansweredReply && (
        <View style={[styles.card, styles.replyCard]}>
          <Text style={styles.replyTitle}>💬 They replied — the ball is in your court</Text>
          <Text style={styles.replySubject} numberOfLines={2}>
            {kase.unansweredReply.subject}
          </Text>
          <Pressable
            style={styles.replyBtn}
            onPress={() => openReply(kase.unansweredReply!)}
            accessibilityRole="button"
            accessibilityLabel="Read the reply and draft your response"
          >
            <Text style={styles.replyBtnText}>✨ Read it & draft your response</Text>
          </Pressable>
        </View>
      )}

      {/* The next lever — exactly one move, silence-gated */}
      {kase?.nextLever && (
        <View style={[styles.card, styles.leverCard]}>
          <Text style={styles.leverReason}>{kase.nextLever.reason}</Text>
          <Pressable
            style={styles.leverBtn}
            onPress={() =>
              navigation.navigate('Letters', {
                template: kase.nextLever!.template,
                requestId: request.id,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={kase.nextLever.label}
          >
            <Text style={styles.leverBtnText}>✉️ {kase.nextLever.label}</Text>
          </Pressable>
        </View>
      )}

      {/* The thread — every event, honestly dated */}
      <View style={styles.threadHead}>
        <Text style={styles.threadTitle}>Your record so far</Text>
        <View style={styles.threadActions}>
          <Pressable
            style={styles.logBtn}
            onPress={() => setShowLog(true)}
            accessibilityRole="button"
            accessibilityLabel="Log a call, meeting, or note on this request"
          >
            <Text style={styles.logBtnText}>+ Log a call</Text>
          </Pressable>
          <Pressable
            style={styles.logBtn}
            disabled={exporting}
            onPress={async () => {
              if (!kase || exporting) return;
              setExporting(true);
              let ok = false;
              try {
                ok = await exportRequestDossier(kase, {
                  parentName:
                    [family?.parent_first_name, family?.parent_last_name]
                      .filter(Boolean)
                      .join(' ') || null,
                  childName: primaryChild?.first_name ?? null,
                });
              } finally {
                setExporting(false);
              }
              if (!ok) {
                showToast(
                  Platform.OS === 'web'
                    ? "The dossier couldn't open — your browser may be blocking pop-ups for this site."
                    : "Couldn't export the dossier — try again.",
                  'error'
                );
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Export this case as a dossier for an advocate or hearing"
          >
            <Text style={styles.logBtnText}>{exporting ? 'Exporting…' : '📄 Export'}</Text>
          </Pressable>
        </View>
      </View>

      {loadFailed && (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={styles.errorText}>
            Couldn't load {events.length === 0 ? 'this record' : 'everything on this record'} —
            what's shown may be incomplete.
          </Text>
          <Pressable
            style={styles.retryBtn}
            onPress={load}
            accessibilityRole="button"
            accessibilityLabel="Try loading the record again"
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {events.length === 0 && loadFailed ? null : events.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyThread}>
            Nothing in writing yet. A phoned ask still counts — log the call so the date is on
            record, and put it in writing when you're ready. Every entry here becomes evidence.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {events.map((e, i) => {
            const c = e.communication;
            const chip = PROVENANCE_CHIP[e.provenance];
            const expanded = expandedId === c.id;
            return (
              <Pressable
                key={c.id}
                style={[styles.event, i > 0 && styles.eventDivider]}
                onPress={() => setExpandedId(expanded ? null : c.id)}
                accessibilityRole="button"
                accessibilityLabel={`${KIND_CONFIG[c.kind].label}: ${c.subject}`}
              >
                <View style={styles.eventTop}>
                  <Text style={styles.eventEmoji}>
                    {c.direction === 'incoming' ? '📥' : KIND_CONFIG[c.kind].emoji}
                  </Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.eventSubject} numberOfLines={expanded ? undefined : 2}>
                      {c.subject}
                    </Text>
                    <Text style={styles.eventMeta}>
                      {[
                        fmtDay(e.when),
                        c.direction === 'incoming' ? 'received' : null,
                        c.status === 'draft' ? 'draft — not sent' : null,
                        c.organization ? ORG_LABELS[c.organization] : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {e.provenance === 'recalled' && (
                      <Text style={styles.recalledNote}>
                        Logged {fmtDay(c.created_at)}, after the fact
                      </Text>
                    )}
                  </View>
                  <View style={[styles.provChip, { backgroundColor: chip.bg }]}>
                    <Text style={[styles.provChipText, { color: chip.fg }]}>{chip.label}</Text>
                  </View>
                </View>
                {expanded && !!c.body && <Text style={styles.eventBody}>{c.body}</Text>}
                {expanded && c.direction === 'incoming' && c.gmail_thread_id && (
                  <Pressable
                    style={styles.eventReplyBtn}
                    onPress={() => openReply(c)}
                    accessibilityRole="button"
                    accessibilityLabel="Draft a reply in this thread"
                  >
                    <Text style={styles.eventReplyText}>✨ Draft a reply with Waypoint</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.privacyFoot}>
        Private to your family. Dates shown are honest: what Gmail carried is marked, what you
        recalled later is marked too.
      </Text>

      <AddEntryModal
        visible={showLog}
        onClose={() => setShowLog(false)}
        presetRequestId={request.id}
        defaultKind="call"
        title={`Log a call on “${request.title}”`}
        onSave={async (entry) => {
          const id = family?.id ? await logCommunication(family.id, entry) : null;
          // Pre-047 the entry saves without its case link — say what actually
          // happened rather than promising it onto a thread it can't join.
          showToast(
            id
              ? pre047
                ? 'Saved to your paper trail'
                : 'Added to this case and your paper trail'
              : "Couldn't save — try again.",
            id ? 'success' : 'error'
          );
          if (id) {
            setShowLog(false);
            await load();
          }
          return !!id;
        }}
      />

      <GmailReplyModal
        visible={!!replyThread}
        thread={replyThread ?? []}
        childName={primaryChild?.first_name}
        parentName={
          [family?.parent_first_name, family?.parent_last_name].filter(Boolean).join(' ') || null
        }
        onClose={() => setReplyThread(null)}
        onSent={() => {
          load();
          refetchRequests();
          showToast('Reply sent — added to this case.', 'success');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing.xl },
  centered: {
    flex: 1,
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: { fontSize: fonts.sizes.md, color: colors.mid, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  title: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.extrabold, color: colors.navy },
  meta: { marginTop: 2, fontSize: fonts.sizes.sm, color: colors.mid },
  provenanceLine: { marginTop: 4, fontSize: fonts.sizes.sm, color: colors.dark },
  statusChip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    justifyContent: 'center',
  },
  statusChipText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
  clockChip: { borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  clockRunning: { backgroundColor: semantic.warningBg },
  clockOverdue: { backgroundColor: semantic.dangerBg },
  clockText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  clockTextRunning: { color: semantic.warning },
  clockTextOverdue: { color: semantic.danger },
  clockNote: { marginTop: 4, fontSize: fonts.sizes.xs, color: colors.mid },
  noClock: { fontSize: fonts.sizes.sm, color: colors.mid },
  rungStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  rungDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rungDotReached: { backgroundColor: colors.navy, borderColor: colors.navy },
  rungDotCurrent: { borderWidth: 2, borderColor: colors.teal },
  rungNum: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold, color: colors.mid },
  rungNumReached: { color: colors.white },
  rungLine: { width: 18, height: 2, backgroundColor: colors.border, borderRadius: 1 },
  rungLineReached: { backgroundColor: colors.navy },
  rungLabel: { fontSize: fonts.sizes.sm, color: colors.mid },
  rungLabelCurrent: { color: colors.navy, fontWeight: fonts.weights.bold },
  silenceLine: { fontSize: fonts.sizes.sm, color: colors.mid },
  replyCard: { borderColor: semantic.info, backgroundColor: '#F0F9FF' },
  replyTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, color: colors.navy },
  replySubject: { fontSize: fonts.sizes.sm, color: colors.dark },
  replyBtn: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  replyBtnText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  leverCard: { borderColor: colors.teal },
  leverReason: { fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 20 },
  leverBtn: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  leverBtnText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  threadHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  threadTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  threadActions: { flexDirection: 'row', gap: spacing.sm },
  logBtn: {
    minHeight: 36,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  logBtnText: { color: colors.teal, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  emptyThread: { fontSize: fonts.sizes.md, color: colors.mid, lineHeight: 20 },
  errorCard: { borderColor: semantic.danger, backgroundColor: semantic.dangerBg },
  errorText: { fontSize: fonts.sizes.sm, color: semantic.danger, lineHeight: 19 },
  retryBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: semantic.danger,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  retryBtnText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: semantic.danger },
  event: { paddingVertical: spacing.sm },
  eventDivider: { borderTopWidth: 1, borderTopColor: colors.light },
  eventTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  eventEmoji: { fontSize: 16 },
  eventSubject: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium, color: colors.dark, lineHeight: 19 },
  eventMeta: { marginTop: 2, fontSize: fonts.sizes.xs, color: colors.mid },
  recalledNote: { marginTop: 2, fontSize: fonts.sizes.xs, color: '#92400E' },
  provChip: {
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  provChipText: { fontSize: 9, fontWeight: fonts.weights.bold, letterSpacing: 0.3 },
  eventBody: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    lineHeight: 18,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  eventReplyBtn: {
    marginTop: spacing.sm,
    minHeight: 36,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  eventReplyText: { color: colors.white, fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold },
  privacyFoot: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
});

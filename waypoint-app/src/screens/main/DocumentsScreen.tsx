/**
 * Document Vault (roadmap 2.1 / 2.2 / 2.5) — upload, organize, view, share,
 * version, and AI-analyze the family's documents. IEP-type documents can be
 * run through the OCR → analyze-iep pipeline (the "IEP Clarity reader").
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useFamily } from '@/hooks/useFamily';
import { useDocuments } from '@/hooks/useDocuments';
import { useDocumentAnalysis } from '@/hooks/useDocumentAnalysis';
import { useToast } from '@/components/Toast';
import AIConsentModal from '@/components/AIConsentModal';
import { Card, Chip, SkeletonCard } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { useTextScale } from '@/lib/textSize';
import type { Document, DocumentType } from '@/types/database';
import { colors, fonts, spacing, radii, semantic } from '@/lib/theme';

const TYPE_OPTIONS: Array<{ key: DocumentType; label: string; emoji: string }> = [
  { key: 'iep', label: 'IEP', emoji: '🏫' },
  { key: 'evaluation', label: 'Evaluation', emoji: '🔍' },
  { key: 'insurance_denial', label: 'Denial', emoji: '🚫' },
  { key: 'appeal', label: 'Appeal', emoji: '⚖️' },
  { key: 'medical_record', label: 'Medical', emoji: '⚕️' },
  { key: 'ipp', label: 'IPP', emoji: '🏛️' },
  { key: 'other', label: 'Other', emoji: '📄' },
];

const SHARE_EXPIRY_OPTIONS = [
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
  { label: '30 days', seconds: 2592000 },
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function DocumentsScreen() {
  const navigation = useNavigation();
  const { family, updateFamily } = useFamily();
  const familyId = family?.id ?? '';

  // AI consent gate (Wave 1.4) — document analysis sends the full IEP text
  const hasAIConsent = !!family?.ai_consent_at;
  const [showConsent, setShowConsent] = useState(false);
  const [pendingAnalyzeDoc, setPendingAnalyzeDoc] = useState<Document | null>(null);
  const { showToast } = useToast();
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);

  const {
    documents,
    loading,
    error,
    uploading,
    pickAndUpload,
    pickAndUploadVersion,
    createShareLink,
    getDownloadUrl,
    updateDocument,
    saveAnalysis,
    refetch,
  } = useDocuments({ familyId });

  const { extractText, analyzeIEP, isExtracting, isAnalyzing, getLastError } = useDocumentAnalysis();

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);

  // Group versions: show only the latest of each version group
  const latestDocs = documents.filter(doc => {
    const groupId = doc.version_group_id ?? doc.id;
    const groupDocs = documents.filter(d => (d.version_group_id ?? d.id) === groupId);
    return doc.version === Math.max(...groupDocs.map(d => d.version));
  });
  const versionCount = (doc: Document) => {
    const groupId = doc.version_group_id ?? doc.id;
    return documents.filter(d => (d.version_group_id ?? d.id) === groupId).length;
  };

  const handleUpload = async (type: DocumentType) => {
    setShowTypePicker(false);
    const doc = await pickAndUpload(type);
    if (doc) showToast(`"${doc.title}" uploaded. 📁`, 'success');
  };

  const handleView = async (doc: Document) => {
    if (!doc.file_path) {
      showToast('This entry has no attached file.', 'info');
      return;
    }
    const url = await getDownloadUrl(doc.file_path);
    if (url) Linking.openURL(url);
  };

  const handleShare = async (doc: Document, seconds: number, label: string) => {
    setShareDocId(null);
    const link = await createShareLink(doc, seconds);
    if (link) {
      await Clipboard.setStringAsync(link);
      showToast(`Share link copied — expires in ${label}. Anyone with the link can view until then.`, 'success');
    } else {
      showToast('Could not create a share link.', 'error');
    }
  };

  const handleNewVersion = async (doc: Document) => {
    const updated = await pickAndUploadVersion(doc);
    if (updated) {
      showToast(`Version ${updated.version} of "${doc.title}" uploaded.`, 'success');
      refetch();
    }
  };

  /** The IEP Clarity reader: OCR (if needed) → AI analysis → results screen */
  const handleAnalyze = async (doc: Document) => {
    if (!hasAIConsent) {
      setPendingAnalyzeDoc(doc);
      setShowConsent(true);
      return;
    }
    setAnalyzingDocId(doc.id);
    try {
      let text = doc.extracted_text;

      if (!text) {
        if (!doc.file_path) {
          showToast('No file to analyze.', 'error');
          return;
        }
        const url = await getDownloadUrl(doc.file_path);
        if (!url) {
          showToast('Could not open the file.', 'error');
          return;
        }
        const blob = await (await fetch(url)).blob();
        if (blob.size > 8 * 1024 * 1024) {
          showToast('File is too large to analyze (8MB max). Try photos of individual pages.', 'error');
          return;
        }
        const base64 = await blobToBase64(blob);
        text = await extractText(doc, base64);
        if (text) {
          // Cache the OCR so re-analysis is instant
          updateDocument(doc.id, { extracted_text: text });
        }
      }

      if (!text) {
        showToast('Could not read text from this document. PDFs work best; photos should be clear and well-lit.', 'error');
        return;
      }

      const analysis = await analyzeIEP(text, 'full');
      if (analysis) {
        // Keep it: a full legal read shouldn't evaporate when the parent
        // leaves the screen, and re-reading costs another AI call
        saveAnalysis(doc.id, analysis).catch(() => {});
        (navigation as any).navigate('DocumentAnalysis', {
          analysis,
          documentId: doc.id,
          childId: doc.child_id,
        });
      } else {
        showToast(getLastError() ?? 'Analysis failed — please try again.', 'error');
      }
    } finally {
      setAnalyzingDocId(null);
    }
  };

  const busy = uploading || isExtracting || isAnalyzing;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <AIConsentModal
        visible={showConsent}
        onAccept={async () => {
          setShowConsent(false);
          await updateFamily({ ai_consent_at: new Date().toISOString() });
          const doc = pendingAnalyzeDoc;
          setPendingAnalyzeDoc(null);
          if (doc) handleAnalyze(doc);
        }}
        onDecline={() => {
          setShowConsent(false);
          setPendingAnalyzeDoc(null);
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload */}
        {showTypePicker ? (
          <Card>
            <Text style={[styles.pickerTitle, { fontSize: sz(14) }]}>What kind of document is this?</Text>
            <View style={styles.typeGrid}>
              {TYPE_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={styles.typeOption}
                  onPress={() => handleUpload(t.key)}
                  accessibilityRole="button"
                  accessibilityLabel={t.label}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, { fontSize: sz(12) }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowTypePicker(false)} style={styles.cancelLink}>
              <Text style={[styles.cancelText, { fontSize: sz(13) }]}>Cancel</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <TouchableOpacity
            style={[styles.uploadButton, busy && styles.uploadButtonDisabled]}
            onPress={() => setShowTypePicker(true)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Upload a document"
          >
            <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
            <Text style={[styles.uploadButtonText, { fontSize: sz(15) }]}>
              {uploading ? 'Uploading…' : 'Upload a document'}
            </Text>
          </TouchableOpacity>
        )}

        {(isExtracting || isAnalyzing) && (
          <Card tone="info">
            <Text style={[styles.analyzingText, { fontSize: sz(13) }]}>
              {isExtracting ? '🔍 Reading your document…' : '🧠 Analyzing the IEP — this takes about a minute…'}
            </Text>
          </Card>
        )}

        {error && (
          <Card tone="danger">
            <Text style={[styles.errorText, { fontSize: sz(13) }]}>{error}</Text>
          </Card>
        )}

        {/* Document list */}
        {loading ? (
          <View>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : latestDocs.length === 0 ? (
          <EmptyState
            emoji="📁"
            title="Your document vault is empty"
            subtitle="Keep IEPs, evaluations, denials, and medical records in one safe place — and let the AI review your IEP."
            actionLabel="Upload your first document"
            onAction={() => setShowTypePicker(true)}
          />
        ) : (
          latestDocs.map(doc => {
            const typeInfo = TYPE_OPTIONS.find(t => t.key === doc.document_type);
            const versions = versionCount(doc);
            return (
              <Card key={doc.id}>
                <TouchableOpacity onPress={() => handleView(doc)} accessibilityRole="button" accessibilityLabel={`View ${doc.title}`}>
                  <View style={styles.docHead}>
                    <Text style={styles.docEmoji}>{typeInfo?.emoji ?? '📄'}</Text>
                    <View style={styles.docHeadText}>
                      <Text style={[styles.docTitle, { fontSize: sz(15) }]} numberOfLines={2}>{doc.title}</Text>
                      <View style={styles.docMeta}>
                        <Chip label={typeInfo?.label ?? doc.document_type} textSize={sz(10)} />
                        {versions > 1 && <Chip label={`v${doc.version} · ${versions} versions`} tone="info" textSize={sz(10)} />}
                        <Text style={[styles.docDate, { fontSize: sz(11) }]}>
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="open-outline" size={18} color={colors.mid} />
                  </View>
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.actionRow}>
                  {(doc.document_type === 'iep' || doc.document_type === 'evaluation') && (
                    <>
                      {/* An analysis already paid for is one tap away, free */}
                      {doc.analysis && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.analyzeButton]}
                          onPress={() =>
                            (navigation as any).navigate('DocumentAnalysis', {
                              analysis: doc.analysis,
                              documentId: doc.id,
                              childId: doc.child_id,
                            })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Open the saved analysis of ${doc.title}`}
                        >
                          <Text style={[styles.analyzeButtonText, { fontSize: sz(12.5) }]}>
                            📖 View analysis
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionButton, !doc.analysis && styles.analyzeButton]}
                        onPress={() => handleAnalyze(doc)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={
                          doc.analysis ? `Re-analyze ${doc.title}` : `Analyze ${doc.title} with AI`
                        }
                      >
                        <Text
                          style={[
                            doc.analysis ? styles.actionButtonText : styles.analyzeButtonText,
                            { fontSize: sz(12.5) },
                          ]}
                        >
                          {analyzingDocId === doc.id
                            ? '⏳ Analyzing…'
                            : doc.analysis
                              ? '🔄 Re-run'
                              : '🧠 AI Review'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setShareDocId(shareDocId === doc.id ? null : doc.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Share ${doc.title}`}
                  >
                    <Text style={[styles.actionButtonText, { fontSize: sz(12.5) }]}>🔗 Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleNewVersion(doc)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Upload a new version of ${doc.title}`}
                  >
                    <Text style={[styles.actionButtonText, { fontSize: sz(12.5) }]}>⬆️ New version</Text>
                  </TouchableOpacity>
                </View>

                {/* Share expiry picker */}
                {shareDocId === doc.id && (
                  <View style={styles.shareRow}>
                    <Text style={[styles.shareLabel, { fontSize: sz(12) }]}>Link expires in:</Text>
                    {SHARE_EXPIRY_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.label}
                        style={styles.shareOption}
                        onPress={() => handleShare(doc, opt.seconds, opt.label)}
                        accessibilityRole="button"
                        accessibilityLabel={`Share link expiring in ${opt.label}`}
                      >
                        <Text style={[styles.shareOptionText, { fontSize: sz(12) }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Card>
            );
          })
        )}

        {/* IEP hub pointer */}
        <TouchableOpacity
          style={styles.hubLink}
          onPress={() => (navigation as any).navigate('IEPHub')}
          accessibilityRole="button"
          accessibilityLabel="Open IEP goals and timeline"
        >
          <Text style={[styles.hubLinkText, { fontSize: sz(14) }]}>🎯 IEP Goals & Timeline →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  uploadButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: spacing.md,
  },
  uploadButtonDisabled: { opacity: 0.6 },
  uploadButtonText: { color: colors.white, fontWeight: fonts.weights.bold as '700' },
  pickerTitle: { fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeOption: {
    flexBasis: '22%',
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  typeEmoji: { fontSize: 22, marginBottom: 2 },
  typeLabel: { color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  cancelLink: { alignItems: 'center', marginTop: spacing.md, minHeight: 44, justifyContent: 'center' },
  cancelText: { color: colors.mid, fontWeight: fonts.weights.semibold as '600' },
  analyzingText: { color: semantic.info, fontWeight: fonts.weights.medium as '500' },
  errorText: { color: semantic.danger },
  docHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  docEmoji: { fontSize: 24 },
  docHeadText: { flex: 1 },
  docTitle: { fontWeight: fonts.weights.bold as '700', color: colors.navy },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4, flexWrap: 'wrap' },
  docDate: { color: colors.mid },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 38,
    justifyContent: 'center',
  },
  actionButtonText: { color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  analyzeButton: { backgroundColor: colors.navy, borderColor: colors.navy },
  analyzeButtonText: { color: colors.white, fontWeight: fonts.weights.bold as '700' },
  shareRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  shareLabel: { color: colors.mid },
  shareOption: {
    backgroundColor: semantic.infoBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  shareOptionText: { color: semantic.info, fontWeight: fonts.weights.semibold as '600' },
  hubLink: { alignItems: 'center', marginTop: spacing.md, minHeight: 44, justifyContent: 'center' },
  hubLinkText: { color: colors.teal, fontWeight: fonts.weights.bold as '700' },
});

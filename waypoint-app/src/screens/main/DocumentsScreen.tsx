/**
 * Document Vault screen — organized storage for IEPs, evaluations, appeals, etc.
 * Sprint 5: Document management with type filtering, upload, and metadata
 *
 * Features:
 * - Document list grouped by type with count badges
 * - Type filter pills (IEP, Evaluation, Insurance, IPP, etc.)
 * - Upload placeholder (hooks into native document picker)
 * - File size and date display
 * - Tag display for document organization
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily } from '@/hooks/useFamily';
import { useDocuments } from '@/hooks/useDocuments';
import type { Document, DocumentType } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

// ─── Config ─────────────────────────────────────────────────────────────────

const DOC_TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  iep: { label: 'IEP', emoji: '🏫', color: '#2563EB' },
  evaluation: { label: 'Evaluation', emoji: '📋', color: '#7C3AED' },
  insurance_denial: { label: 'Denial', emoji: '🚫', color: '#DC2626' },
  appeal: { label: 'Appeal', emoji: '⚖️', color: '#EA580C' },
  medical_record: { label: 'Medical', emoji: '⚕️', color: '#059669' },
  ipp: { label: 'IPP', emoji: '🏛️', color: '#0891B2' },
  other: { label: 'Other', emoji: '📄', color: '#64748B' },
};

const TYPE_FILTERS: Array<{ key: 'all' | DocumentType; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'iep', label: 'IEP' },
  { key: 'evaluation', label: 'Evaluations' },
  { key: 'insurance_denial', label: 'Denials' },
  { key: 'appeal', label: 'Appeals' },
  { key: 'medical_record', label: 'Medical' },
  { key: 'ipp', label: 'IPP' },
  { key: 'other', label: 'Other' },
];

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function DocumentsScreen() {
  const { family } = useFamily();
  const familyId = family?.id ?? '';
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');

  const {
    documents,
    loading,
    error,
    uploading,
    countByType,
    getDownloadUrl,
    refetch,
  } = useDocuments({
    familyId,
    typeFilter: typeFilter === 'all' ? undefined : typeFilter,
  });

  // Summary stats
  const totalDocs = documents.length;

  const handleDocPress = async (doc: Document) => {
    if (doc.file_path) {
      const url = await getDownloadUrl(doc.file_path);
      if (url) {
        // In production, use Linking.openURL(url) or a document viewer
        Alert.alert('Document Ready', `${doc.title} is ready to view.`);
      }
    } else {
      Alert.alert(doc.title, doc.extracted_text ?? 'No content available.');
    }
  };

  const handleUpload = () => {
    // In production, this would open DocumentPicker from expo-document-picker
    Alert.alert(
      'Upload Document',
      'Document upload will use your device\'s file picker. This feature requires expo-document-picker to be configured.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Document Vault</Text>
          <Text style={styles.headerSubtitle}>{totalDocs} document{totalDocs !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
          <Text style={styles.uploadButtonText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Type Summary */}
      <View style={styles.summaryRow}>
        {Object.entries(countByType)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([type, count]) => {
            const config = DOC_TYPE_CONFIG[type] ?? DOC_TYPE_CONFIG.other;
            return (
              <View key={type} style={styles.summaryPill}>
                <Text style={styles.summaryEmoji}>{config.emoji}</Text>
                <Text style={styles.summaryCount}>{count}</Text>
                <Text style={styles.summaryLabel}>{config.label}</Text>
              </View>
            );
          })}
      </View>

      {/* Type Filters */}
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, typeFilter === f.key && styles.filterPillActive]}
            onPress={() => setTypeFilter(f.key)}
          >
            <Text style={[styles.filterText, typeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Document List */}
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DocumentCard document={item} onPress={() => handleDocPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.teal} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📁</Text>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptySubtitle}>
              Upload IEPs, evaluations, insurance letters, and other important documents to keep them organized and accessible.
            </Text>
            <TouchableOpacity style={styles.emptyUploadButton} onPress={handleUpload}>
              <Text style={styles.emptyUploadText}>Upload First Document</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Document Card ──────────────────────────────────────────────────────────

function DocumentCard({ document, onPress }: { document: Document; onPress: () => void }) {
  const config = DOC_TYPE_CONFIG[document.document_type] ?? DOC_TYPE_CONFIG.other;
  const fileSize = document.file_size ? formatFileSize(document.file_size) : null;
  const uploadDate = formatDate(document.uploaded_at);

  return (
    <TouchableOpacity style={styles.docCard} onPress={onPress} activeOpacity={0.7}>
      {/* Type icon */}
      <View style={[styles.docIcon, { backgroundColor: config.color + '15' }]}>
        <Text style={styles.docIconEmoji}>{config.emoji}</Text>
      </View>

      {/* Content */}
      <View style={styles.docContent}>
        <Text style={styles.docTitle} numberOfLines={2}>{document.title}</Text>
        <View style={styles.docMeta}>
          <View style={[styles.docTypeBadge, { backgroundColor: config.color + '20' }]}>
            <Text style={[styles.docTypeText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={styles.docDate}>{uploadDate}</Text>
          {fileSize && <Text style={styles.docSize}>{fileSize}</Text>}
        </View>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <View style={styles.tagRow}>
            {document.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {document.tags.length > 3 && (
              <Text style={styles.tagMore}>+{document.tags.length - 3}</Text>
            )}
          </View>
        )}

        {/* Key dates indicator */}
        {document.key_dates && Object.keys(document.key_dates).length > 0 && (
          <Text style={styles.keyDatesHint}>
            📅 {Object.keys(document.key_dates).length} key date{Object.keys(document.key_dates).length !== 1 ? 's' : ''} tracked
          </Text>
        )}
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.navy },
  headerSubtitle: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  uploadButton: {
    backgroundColor: colors.teal, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  uploadButtonText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.semibold, color: colors.white },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  summaryPill: { alignItems: 'center' },
  summaryEmoji: { fontSize: 18 },
  summaryCount: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold, color: colors.dark, marginTop: 2 },
  summaryLabel: { fontSize: 9, color: colors.mid },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
    flexWrap: 'wrap', gap: 4,
  },
  filterPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.light },
  filterPillActive: { backgroundColor: colors.teal },
  filterText: { fontSize: 10, color: colors.dark, fontWeight: fonts.weights.medium },
  filterTextActive: { color: colors.white },
  listContent: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  docCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  docIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  docIconEmoji: { fontSize: 20 },
  docContent: { flex: 1 },
  docTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.dark, lineHeight: 18 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  docTypeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  docTypeText: { fontSize: 9, fontWeight: fonts.weights.semibold },
  docDate: { fontSize: 10, color: colors.mid },
  docSize: { fontSize: 10, color: colors.mid },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  tag: { backgroundColor: colors.light, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  tagText: { fontSize: 9, color: colors.mid },
  tagMore: { fontSize: 9, color: colors.mid, alignSelf: 'center' },
  keyDatesHint: { fontSize: 9, color: colors.teal, marginTop: 4 },
  chevron: { fontSize: 20, color: colors.border, marginLeft: 4 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  emptyUploadButton: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: 10 },
  emptyUploadText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.white },
  errorBanner: {
    position: 'absolute', bottom: 80, left: spacing.md, right: spacing.md,
    backgroundColor: '#FEE2E2', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md,
  },
  errorText: { fontSize: fonts.sizes.xs, color: '#DC2626' },
});

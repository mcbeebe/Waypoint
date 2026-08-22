/**
 * Documents hook — CRUD for the document vault
 * Uses existing `documents` table from migration 001
 * Supports Supabase Storage file upload/download
 */

import { useState, useEffect, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
import { retryQuery, friendlyErrorMessage } from '@/lib/netRetry';
import type { Document, DocumentType } from '@/types/database';

const STORAGE_BUCKET = 'documents';

interface UseDocumentsOptions {
  familyId: string;
  typeFilter?: DocumentType;
  childId?: string;
}

interface UploadDocumentInput {
  title: string;
  document_type: DocumentType;
  child_id?: string;
  file: {
    uri: string;
    name: string;
    type: string;
    size: number;
  };
  tags?: string[];
  key_dates?: Record<string, string>;
  version?: number;
  version_group_id?: string;
}

interface CreateDocumentInput {
  title: string;
  document_type: DocumentType;
  child_id?: string;
  tags?: string[];
  key_dates?: Record<string, string>;
  extracted_text?: string;
}

export function useDocuments(options: UseDocumentsOptions) {
  const { familyId, typeFilter, childId } = options;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('family_id', familyId)
        .order('uploaded_at', { ascending: false });

      if (typeFilter) {
        query = query.eq('document_type', typeFilter);
      }
      if (childId) {
        query = query.eq('child_id', childId);
      }

      const { data, error: dbError } = await retryQuery(() => query);
      if (dbError) throw new Error(dbError.message);
      setDocuments((data as Document[]) ?? []);
      setError(null);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your documents."));
    }
  }, [familyId, typeFilter, childId]);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    fetchDocuments().finally(() => setLoading(false));
  }, [familyId, fetchDocuments]);

  /** Upload a file to Supabase Storage and create a document record */
  const uploadDocument = useCallback(async (input: UploadDocumentInput): Promise<Document | null> => {
    setError(null);
    setUploading(true);

    try {
      // Generate a unique storage path (first folder segment MUST be the
      // family id — the storage RLS policy keys on it)
      const storagePath = `${familyId}/${Date.now()}_${input.file.name}`;

      // Fetch the picker URI into a Blob — works on web (blob:/data: URIs)
      // and native (file:// URIs) alike
      const fileResponse = await fetch(input.file.uri);
      const blob = await fileResponse.blob();

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, { contentType: input.file.type, upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // Create document record
      const { data: doc, error: dbError } = await supabase
        .from('documents')
        .insert({
          family_id: familyId,
          child_id: input.child_id ?? null,
          title: input.title,
          document_type: input.document_type,
          file_path: storagePath,
          file_size: input.file.size || blob.size,
          mime_type: input.file.type,
          tags: input.tags ?? null,
          key_dates: input.key_dates ?? null,
          version: input.version ?? 1,
          version_group_id: input.version_group_id ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);

      const document = doc as Document;
      setDocuments((prev) => [document, ...prev]);
      return document;
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't upload that file."));
      return null;
    } finally {
      setUploading(false);
    }
  }, [familyId]);

  /** Create a document record without file upload (for text-only entries) */
  const createDocument = useCallback(async (input: CreateDocumentInput): Promise<Document | null> => {
    setError(null);
    try {
      const { data: doc, error: dbError } = await supabase
        .from('documents')
        .insert({
          family_id: familyId,
          child_id: input.child_id ?? null,
          title: input.title,
          document_type: input.document_type,
          tags: input.tags ?? null,
          key_dates: input.key_dates ?? null,
          extracted_text: input.extracted_text ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const document = doc as Document;
      setDocuments((prev) => [document, ...prev]);
      return document;
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't save that document."));
      return null;
    }
  }, [familyId]);

  /** Get a signed download URL for a document */
  const getDownloadUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const { data, error: urlError } = await retryQuery(() =>
        supabase.storage.from(STORAGE_BUCKET).createSignedUrl(filePath, 3600) // 1 hour expiry
      );

      if (urlError) throw new Error(urlError.message);
      setError(null);
      return data!.signedUrl;
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't open that file."));
      return null;
    }
  }, []);

  /** Update document metadata */
  const updateDocument = useCallback(async (id: string, data: Partial<Document>) => {
    setError(null);
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    try {
      const { error: dbError } = await supabase
        .from('documents')
        .update(data)
        .eq('id', id);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't save that change."));
      fetchDocuments();
    }
  }, [fetchDocuments]);

  /** Let the parent dismiss a banner they've read. */
  const clearError = useCallback(() => setError(null), []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchDocuments();
    setLoading(false);
  }, [fetchDocuments]);

  /** Count documents by type */
  const countByType = documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] ?? 0) + 1;
    return acc;
  }, {});

  /**
   * Launch the native document picker and upload the selected file.
   * Convenience method that combines expo-document-picker + uploadDocument.
   */
  const pickAndUpload = useCallback(async (
    documentType: DocumentType,
    title?: string,
    childIdOverride?: string
  ): Promise<Document | null> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const asset = result.assets[0];
      return await uploadDocument({
        title: title ?? asset.name ?? 'Untitled Document',
        document_type: documentType,
        child_id: childIdOverride ?? childId ?? undefined,
        file: {
          uri: asset.uri,
          name: asset.name ?? 'document',
          type: asset.mimeType ?? 'application/octet-stream',
          size: asset.size ?? 0,
        },
      });
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't upload that file."));
      return null;
    }
  }, [uploadDocument, childId]);

  /**
   * Pick a file and upload it as a NEW VERSION of an existing document.
   * Versions share a version_group_id (the original document's id).
   */
  const pickAndUploadVersion = useCallback(async (original: Document): Promise<Document | null> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return null;

      const groupId = original.version_group_id ?? original.id;
      const groupVersions = documents.filter(
        (d) => d.id === groupId || d.version_group_id === groupId
      );
      const nextVersion = Math.max(1, ...groupVersions.map((d) => d.version)) + 1;

      // Backfill the group id on the original so the family is queryable
      if (!original.version_group_id) {
        await updateDocument(original.id, { version_group_id: groupId });
      }

      const asset = result.assets[0];
      return await uploadDocument({
        title: original.title,
        document_type: original.document_type,
        child_id: original.child_id ?? undefined,
        version: nextVersion,
        version_group_id: groupId,
        file: {
          uri: asset.uri,
          name: asset.name ?? 'document',
          type: asset.mimeType ?? 'application/octet-stream',
          size: asset.size ?? 0,
        },
      });
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't upload that version."));
      return null;
    }
  }, [documents, uploadDocument, updateDocument]);

  /**
   * Create a share link: a signed URL with the chosen expiry, recorded in
   * document_shares so the family has an audit trail of what was shared.
   */
  const createShareLink = useCallback(async (
    doc: Document,
    expiresInSeconds: number,
    note?: string
  ): Promise<string | null> => {
    if (!doc.file_path) {
      setError('This document has no file to share.');
      return null;
    }
    try {
      const { data, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(doc.file_path, expiresInSeconds);
      if (urlError) throw new Error(urlError.message);

      const { error: logError } = await supabase.from('document_shares').insert({
        document_id: doc.id,
        family_id: familyId,
        expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
        note: note ?? null,
      });
      if (logError) console.warn('Share log failed:', logError.message);

      return data.signedUrl;
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't create a share link."));
      return null;
    }
  }, [familyId]);

  /**
   * Keep the analysis with the document that produced it. Before this it
   * lived only in navigation state — leaving the screen discarded a full
   * legal read, and re-opening meant paying for the AI again.
   */
  const saveAnalysis = useCallback(async (
    documentId: string,
    analysis: unknown
  ): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase
        .from('documents')
        .update({ analysis, analyzed_at: new Date().toISOString() })
        .eq('id', documentId);
      if (dbError) {
        // Pre-033 database: the read still worked, it just isn't saved yet
        if (/analysis|analyzed_at/i.test(dbError.message)) return false;
        throw new Error(dbError.message);
      }
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentId
            ? { ...d, analysis: analysis as Document['analysis'], analyzed_at: new Date().toISOString() }
            : d
        )
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    documents,
    loading,
    error,
    clearError,
    uploading,
    saveAnalysis,
    countByType,
    uploadDocument,
    createDocument,
    pickAndUpload,
    pickAndUploadVersion,
    createShareLink,
    getDownloadUrl,
    updateDocument,
    refetch,
  };
}

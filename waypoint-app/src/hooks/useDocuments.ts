/**
 * Documents hook — CRUD for the document vault
 * Uses existing `documents` table from migration 001
 * Supports Supabase Storage file upload/download
 */

import { useState, useEffect, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
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

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      setDocuments((data as Document[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      // Generate a unique storage path
      const ext = input.file.name.split('.').pop() ?? 'pdf';
      const storagePath = `${familyId}/${Date.now()}_${input.file.name}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, {
          uri: input.file.uri,
          name: input.file.name,
          type: input.file.type,
        } as unknown as File);

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
          file_size: input.file.size,
          mime_type: input.file.type,
          tags: input.tags ?? null,
          key_dates: input.key_dates ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);

      const document = doc as Document;
      setDocuments((prev) => [document, ...prev]);
      return document;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [familyId]);

  /** Get a signed download URL for a document */
  const getDownloadUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const { data, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (urlError) throw new Error(urlError.message);
      return data.signedUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      setError(err instanceof Error ? err.message : String(err));
      fetchDocuments();
    }
  }, [fetchDocuments]);

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
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [uploadDocument, childId]);

  return {
    documents,
    loading,
    error,
    uploading,
    countByType,
    uploadDocument,
    createDocument,
    pickAndUpload,
    getDownloadUrl,
    updateDocument,
    refetch,
  };
}

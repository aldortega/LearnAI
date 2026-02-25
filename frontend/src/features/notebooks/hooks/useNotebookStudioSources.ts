import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";

import { documentsApi } from "../api/documentsApi";
import type { Document } from "../types/documents.types";
import { useDocumentStream } from "./useDocumentStream";
import { useDocuments } from "./useDocuments";
import { useUploadDocument } from "./useUploadDocument";

const allowedExtensions = [".pdf", ".docx", ".txt", ".pptx"];

export type NotebookStudioSourcesResult = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  documents: Document[];
  hasReadySources: boolean;
  readySignature: string;
  isUploading: boolean;
  deletingDocumentIds: Set<string>;
  deleteTarget: Document | null;
  setDeleteTarget: (document: Document | null) => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
  pickFile: () => void;
};

export function useNotebookStudioSources(
  notebookId?: string,
): NotebookStudioSourcesResult {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streamKey, setStreamKey] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [deleteTarget, setDeleteTargetState] = useState<Document | null>(null);

  const {
    documents: streamedDocuments,
    error: streamError,
  } = useDocumentStream(notebookId, streamKey);
  const { documents: fetchedDocuments, reload } = useDocuments(notebookId, useFallback);
  const { uploadDocument, isUploading } = useUploadDocument(notebookId);

  useEffect(() => {
    queueMicrotask(() => {
      setUseFallback(false);
      setStreamKey(0);
      setDeleteTargetState(null);
      setDeletingDocumentIds(new Set());
    });
  }, [notebookId]);

  const documents = useFallback ? fetchedDocuments : streamedDocuments;

  useEffect(() => {
    if (streamError && documents.length === 0) {
      queueMicrotask(() => {
        setUseFallback(true);
      });
    }
  }, [streamError, documents.length]);

  const processFileUpload = async (file: File) => {
    const extension = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return;
    }

    await uploadDocument(file);

    if (useFallback) {
      await reload();
    } else {
      setStreamKey((prev) => prev + 1);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await processFileUpload(file);
  };

  const handleDeleteConfirm = async () => {
    if (!notebookId || !deleteTarget) return;

    const documentId = deleteTarget.id;
    setDeletingDocumentIds((prev) => new Set(prev).add(documentId));

    try {
      await documentsApi.remove(notebookId, documentId);
    } catch {
      setDeletingDocumentIds((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
      setDeleteTargetState(null);
      return;
    }

    setDeletingDocumentIds((prev) => {
      const next = new Set(prev);
      next.delete(documentId);
      return next;
    });
    setDeleteTargetState(null);

    if (useFallback) {
      await reload();
    } else {
      setStreamKey((prev) => prev + 1);
    }
  };

  const hasReadySources = useMemo(
    () => documents.some((document) => document.status === "done"),
    [documents],
  );
  const readySignature = useMemo(
    () =>
      documents
        .filter((document) => document.status === "done")
        .map((document) => `${document.id}:${document.updated_at}`)
        .join("|"),
    [documents],
  );

  return {
    fileInputRef,
    documents,
    hasReadySources,
    readySignature,
    isUploading,
    deletingDocumentIds,
    deleteTarget,
    setDeleteTarget: setDeleteTargetState,
    handleFileChange,
    handleDeleteConfirm,
    pickFile: () => fileInputRef.current?.click(),
  };
}

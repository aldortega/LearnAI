import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";

import { useToast } from "../../../shared/ui/toast/useToast";
import { documentsApi } from "../api/documentsApi";
import type { Document } from "../types/documents.types";
import { buildRejectedFilesToast, splitSourceFiles } from "../utils/sourceFiles";
import { useDocumentStream } from "./useDocumentStream";
import { useDocuments } from "./useDocuments";
import { useUploadDocument } from "./useUploadDocument";

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
  handleDropFiles: (files: File[]) => Promise<void>;
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
  const { pushToast } = useToast();

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

  const processFilesUpload = async (files: File[]) => {
    const { validFiles, rejectedFiles } = splitSourceFiles(files);
    if (rejectedFiles.length > 0) pushToast(buildRejectedFilesToast(rejectedFiles));
    if (validFiles.length === 0) return;

    for (const file of validFiles) {
      await uploadDocument(file);
    }

    if (useFallback) {
      await reload();
    } else {
      setStreamKey((prev) => prev + 1);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await processFilesUpload(files);
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
    handleDropFiles: processFilesUpload,
    handleDeleteConfirm,
    pickFile: () => fileInputRef.current?.click(),
  };
}

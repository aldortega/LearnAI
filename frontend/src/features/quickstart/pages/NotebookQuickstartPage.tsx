import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { documentsApi } from "../../notebooks/api/documentsApi";
import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import type { Document } from "../../notebooks/types/documents.types";
import {
  useDocuments,
  useDocumentStream,
  useNotebook,
  useNotebookReadySources,
  useUploadDocument,
} from "../../notebooks";
import { QuickstartEmptyState } from "../components/QuickstartEmptyState";
import { QuickstartOverview } from "../components/QuickstartOverview";
import { QuickstartShell } from "../components/QuickstartShell";
import { useQuickstartBootstrapState } from "../hooks/useQuickstartBootstrapState";
import { useGenerateQuickstart } from "../hooks/useGenerateQuickstart";
import { useQuickstart } from "../hooks/useQuickstart";
import { NotebookLoadingScreen } from "../../../shared/ui/NotebookLoadingScreen";

const allowedExtensions = [".pdf", ".docx", ".txt", ".pptx"];

export function NotebookQuickstartPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const {
    hasReadySources,
    isResolving: isResolvingReadySources,
  } = useNotebookReadySources(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streamKey, setStreamKey] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const hasCheckedLatestJobRef = useRef(false);

  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const {
    documents: streamedDocuments,
    error: streamError,
  } = useDocumentStream(notebookId, streamKey);

  const { documents: fetchedDocuments, reload } = useDocuments(
    notebookId,
    useFallback,
  );
  const { uploadDocument, isUploading } = useUploadDocument(notebookId);

  const {
    quickstart,
    isLoading: isQuickstartLoading,
    error: quickstartError,
    reload: reloadQuickstart,
  } = useQuickstart(notebookId);

  const {
    generate,
    resumeLatest,
    isGenerating,
    error: generateError,
    clearError: clearGenerateError,
  } = useGenerateQuickstart(notebookId);

  useEffect(() => {
    queueMicrotask(() => {
      setUseFallback(false);
      setStreamKey(0);
    });
  }, [notebookId]);

  useEffect(() => {
    hasCheckedLatestJobRef.current = false;
  }, [notebookId]);

  const documents = useFallback ? fetchedDocuments : streamedDocuments;

  useEffect(() => {
    if (streamError && documents.length === 0) {
      queueMicrotask(() => {
        setUseFallback(true);
      });
    }
  }, [streamError, documents.length]);

  const handlePickFile = () => {
    if (!canManageDocuments) return;
    fileInputRef.current?.click();
  };

  const processFileUpload = async (file: File) => {
    if (!canManageDocuments) return;
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

  const handleDeleteRequest = (document: Document) => {
    if (!canManageDocuments) return;
    setDeleteTarget(document);
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!notebookId || !deleteTarget || !canManageDocuments) return;

    const documentId = deleteTarget.id;

    setDeletingDocumentIds((prev) => {
      const next = new Set(prev);
      next.add(documentId);
      return next;
    });

    try {
      await documentsApi.remove(notebookId, documentId);
    } catch {
      setDeletingDocumentIds((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
      setDeleteTarget(null);
      return;
    }

    setDeletingDocumentIds((prev) => {
      const next = new Set(prev);
      next.delete(documentId);
      return next;
    });

    setDeleteTarget(null);

    if (useFallback) {
      await reload();
    } else {
      setStreamKey((prev) => prev + 1);
    }
  };

  const readySignature = useMemo(
    () =>
      documents
        .filter((doc) => doc.status === "done")
        .map((doc) => `${doc.id}:${doc.updated_at}`)
        .join("|"),
    [documents],
  );

  const handleGenerateQuickstart = async () => {
    if (!notebookId) return;
    clearGenerateError();
    const result = await generate();
    if (result) {
      await reloadQuickstart();
    }
  };

  useEffect(() => {
    if (!notebookId) return;
    void reloadQuickstart();
  }, [notebookId, reloadQuickstart, readySignature]);

  useEffect(() => {
    if (!notebookId || hasCheckedLatestJobRef.current) return;
    if (quickstart && quickstart.status !== "missing") return;
    if (isQuickstartLoading || isGenerating) return;

    hasCheckedLatestJobRef.current = true;

    void (async () => {
      const result = await resumeLatest({ suppressFailedError: true });
      if (result?.status === "done") {
        await reloadQuickstart();
      }
    })();
  }, [
    notebookId,
    quickstart,
    isQuickstartLoading,
    isGenerating,
    resumeLatest,
    reloadQuickstart,
  ]);

  const isEmpty = !quickstart || quickstart.status === "missing";
  const combinedError = generateError ?? quickstartError;
  const isResolvingInitialQuickstartView = useQuickstartBootstrapState({
    isNotebookLoading,
    isResolvingReadySources,
    quickstart,
    error: combinedError,
  });

  if (isResolvingInitialQuickstartView) {
    return <NotebookLoadingScreen />;
  }

  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      canManageDocuments={canManageDocuments}
      isNotebookLoading={isNotebookLoading}
      isUploading={isUploading}
      deletingDocumentIds={deletingDocumentIds}
      onAddSource={handlePickFile}
      onDeleteDocument={handleDeleteRequest}
      mode="quickstart"
      isStudioLocked={false}
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={isGenerating}
      canStartReports={hasReadySources}
      isGeneratingReports={false}
      canStartPresentations={hasReadySources}
      isGeneratingPresentations={false}
      canStartMindmap={hasReadySources}
      isGeneratingMindmap={false}
      canStartFlashcards={hasReadySources}
      isGeneratingFlashcards={false}
      onGoChat={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/chat`);
      }}
      onGoQuiz={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/quiz`);
      }}
      onGoQuickstart={() => {
        // already on quickstart
      }}
      onGoReports={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/reports`);
      }}
      onGoPresentations={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/presentations`);
      }}
      onGoMindmap={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/mindmap`);
      }}
      onGoFlashcards={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/flashcards`);
      }}
      beforeMain={
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.pptx"
          onChange={handleFileChange}
        />
      }
      footer={
        <DeleteDocumentModal
          isOpen={Boolean(deleteTarget)}
          documentName={deleteTarget?.file_name}
          isDeleting={
            deleteTarget ? deletingDocumentIds.has(deleteTarget.id) : false
          }
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      }
    >
      <QuickstartShell
        showRefreshAction={!isEmpty}
        canRefresh={hasReadySources}
        isRefreshing={isGenerating}
        onRefresh={() => {
          void handleGenerateQuickstart();
        }}
      >
        {isEmpty ? (
          <QuickstartEmptyState
            isGenerating={isGenerating}
            canGenerate={hasReadySources}
            error={combinedError}
            onGenerate={handleGenerateQuickstart}
          />
        ) : quickstart ? (
          <QuickstartOverview
            quickstart={quickstart}
            notebookId={notebookId}
            error={combinedError}
          />
        ) : null}
      </QuickstartShell>
    </NotebookShell>
  );
}


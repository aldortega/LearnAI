import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { documentsApi } from "../../notebooks/api/documentsApi";
import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import type { Document } from "../../notebooks/types/documents.types";
import { Button } from "../../../shared/ui/Button";
import {
  useDocuments,
  useDocumentStream,
  useNotebook,
  useUploadDocument,
} from "../../notebooks";
import { QuickstartShell } from "../components/QuickstartShell";
import { QuickstartTopicDetailView } from "../components/QuickstartTopicDetailView";
import { useGenerateQuickstart } from "../hooks/useGenerateQuickstart";
import { useQuickstart } from "../hooks/useQuickstart";
import { useQuickstartExpansion } from "../hooks/useQuickstartExpansion";
import { useQuickstartTopicDetail } from "../hooks/useQuickstartTopicDetail";

const allowedExtensions = [".pdf", ".docx", ".txt", ".pptx"];

function normalizeDetailItem(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function NotebookQuickstartTopicPage() {
  const { notebookId, topicId } = useParams();
  const navigate = useNavigate();
  const { notebook } = useNotebook(notebookId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streamKey, setStreamKey] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
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
    isGenerating,
    error: generateError,
    clearError: clearGenerateError,
  } = useGenerateQuickstart(notebookId);

  const topic = useMemo(
    () => quickstart?.topics.find((item) => item.id === topicId) ?? null,
    [quickstart, topicId],
  );
  const isStale = quickstart?.status === "stale";
  const {
    expansion,
    isLoading: isExpansionLoading,
    error: expansionError,
    expand,
  } = useQuickstartExpansion(notebookId, topic?.id);
  const {
    detail,
    selected,
    isLoading: isDetailLoading,
    error: detailError,
    loadDetail,
    clearDetail,
  } = useQuickstartTopicDetail(notebookId, topic?.id);

  useEffect(() => {
    queueMicrotask(() => {
      setUseFallback(false);
      setStreamKey(0);
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

  const hasReadySources = documents.some((doc) => doc.status === "done");
  const readySignature = useMemo(
    () =>
      documents
        .filter((doc) => doc.status === "done")
        .map((doc) => `${doc.id}:${doc.updated_at}`)
        .join("|"),
    [documents],
  );

  useEffect(() => {
    if (!notebookId) return;
    void reloadQuickstart();
  }, [notebookId, reloadQuickstart, readySignature]);

  useEffect(() => {
    if (!quickstart || quickstart.status === "missing" || !notebookId) return;
    if (!topicId || topic) return;
    navigate(`/notebook/${notebookId}/quickstart`, { replace: true });
  }, [quickstart, topicId, topic, notebookId, navigate]);

  useEffect(() => {
    if (!topic || isStale) return;
    void expand();
  }, [topic, isStale, expand]);

  useEffect(() => {
    clearDetail();
  }, [topic?.id, clearDetail]);

  const handlePickFile = () => fileInputRef.current?.click();

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

  const handleDeleteRequest = (document: Document) => setDeleteTarget(document);
  const handleDeleteCancel = () => setDeleteTarget(null);

  const handleDeleteConfirm = async () => {
    if (!notebookId || !deleteTarget) return;

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

  const handleGenerateQuickstart = async () => {
    if (!notebookId) return;
    clearGenerateError();
    const result = await generate();
    if (!result) return;
    await reloadQuickstart();
    navigate(`/notebook/${notebookId}/quickstart`, { replace: true });
  };

  const handleSelectDetail = (
    itemType: "additional_key_point" | "question",
    itemText: string,
  ) => {
    if (isStale) return;
    if (
      selected &&
      selected.itemType === itemType &&
      normalizeDetailItem(selected.itemText) === normalizeDetailItem(itemText)
    ) {
      clearDetail();
      return;
    }
    void loadDetail(itemType, itemText);
  };

  const combinedError = generateError ?? quickstartError;
  const showTopicView = Boolean(quickstart && topic);

  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      isUploading={isUploading}
      deletingDocumentIds={deletingDocumentIds}
      onAddSource={handlePickFile}
      onDeleteDocument={handleDeleteRequest}
      mode="quickstart"
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={isGenerating}
      canStartReports={hasReadySources}
      isGeneratingReports={false}
      onGoChat={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/chat`);
      }}
      onGoQuiz={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/quiz`);
      }}
      onGoQuickstart={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/quickstart`);
      }}
      onGoReports={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/reports`);
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
        showRefreshAction={Boolean(quickstart && quickstart.status !== "missing")}
        canRefresh={hasReadySources}
        isRefreshing={isGenerating}
        onRefresh={() => {
          void handleGenerateQuickstart();
        }}
      >
        {isQuickstartLoading && !quickstart ? (
          <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">Cargando inicio rapido...</p>
          </div>
        ) : showTopicView && topic ? (
          <QuickstartTopicDetailView
            topic={topic}
            isStale={Boolean(isStale)}
            expansion={expansion}
            isExpansionLoading={isExpansionLoading}
            expansionError={expansionError}
            detail={detail}
            selectedDetail={selected}
            isDetailLoading={isDetailLoading}
            detailError={detailError}
            onSelectDetail={handleSelectDetail}
          />
        ) : (
          <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center px-6">
            <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
              <p className="text-sm text-muted-foreground" role={combinedError ? "alert" : undefined}>
                {combinedError ?? "No se encontro el tema solicitado."}
              </p>
              <Button
                variant="ghost"
                className="border border-border"
                onClick={() => {
                  if (!notebookId) return;
                  navigate(`/notebook/${notebookId}/quickstart`, { replace: true });
                }}
              >
                Volver a quickstart
              </Button>
            </div>
          </div>
        )}
      </QuickstartShell>
    </NotebookShell>
  );
}

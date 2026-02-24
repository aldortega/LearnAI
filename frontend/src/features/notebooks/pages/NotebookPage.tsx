import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ChatArea, useNotebookChat } from "../../notebook-chat";
import { documentsApi } from "../api/documentsApi";
import { DeleteDocumentModal } from "../components/DeleteDocumentModal";
import { NotebookShell } from "../components/NotebookShell";
import { NotebookSourcesEmptyState } from "../components/NotebookSourcesEmptyState";
import type { Document } from "../types/documents.types";
import {
  useDocuments,
  useDocumentStream,
  useNotebook,
  useNotebookReadySources,
  useUploadDocument,
} from "../index";

const allowedExtensions = [".pdf", ".docx", ".txt", ".pptx"];

type Props = {
  redirectWhenReady?: boolean;
};

export function NotebookPage({ redirectWhenReady = false }: Props) {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const { isResolving, hasProcessingDocuments } = useNotebookReadySources(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
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
    messages,
    streamingContent,
    isLoading: isChatLoading,
    isStreaming: isChatStreaming,
    isClearing: isChatClearing,
    error: chatError,
    sendMessage,
    clearConversation,
  } = useNotebookChat(notebookId);

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

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    await processFileUpload(file);
  };

  const handleDropFile = async (file: File) => {
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



  const hasReadySources = documents.some((doc) => doc.status === "done");

  useEffect(() => {
    if (!redirectWhenReady || !notebookId || !hasReadySources) return;
    navigate(`/notebook/${notebookId}/quickstart`, { replace: true });
  }, [redirectWhenReady, hasReadySources, navigate, notebookId]);

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
      mode="chat"
      isStudioLocked={!hasReadySources}
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={false}
      canStartReports={hasReadySources}
      isGeneratingReports={false}
      canStartPresentations={hasReadySources}
      isGeneratingPresentations={false}
      canStartMindmap={hasReadySources}
      isGeneratingMindmap={false}
      canStartFlashcards={hasReadySources}
      isGeneratingFlashcards={false}
      onGoChat={() => {
        // already on chat
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
      {hasReadySources ? (
        <ChatArea
          hasSources={hasReadySources}
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isChatLoading}
          isStreaming={isChatStreaming}
          isClearing={isChatClearing}
          error={chatError}
          onSendMessage={sendMessage}
          onClearChat={clearConversation}
          onDropFile={handleDropFile}
        />
      ) : isResolving ? (
        <div className="grid min-h-[320px] place-items-center px-6 py-10">
          <div className="max-w-md rounded-2xl border border-border bg-surface px-6 py-5 text-center">
            <h2 className="text-base font-semibold text-foreground">
              Verificando fuentes...
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos comprobando el estado de tus documentos.
            </p>
          </div>
        </div>
      ) : hasProcessingDocuments ? (
        <div className="grid min-h-[320px] place-items-center px-6 py-10">
          <div className="max-w-md rounded-2xl border border-border bg-surface px-6 py-5 text-center">
            <h2 className="text-base font-semibold text-foreground">
              Tus fuentes se estan procesando
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cuando termine la ingesta, el studio se habilitara automaticamente.
            </p>
          </div>
        </div>
      ) : (
        <NotebookSourcesEmptyState
          canManageDocuments={canManageDocuments}
          onDropFile={handleDropFile}
        />
      )}
    </NotebookShell>
  );
}


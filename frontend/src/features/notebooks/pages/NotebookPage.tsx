import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ChatArea, useNotebookChat } from "../../notebook-chat";
import { documentsApi } from "../api/documentsApi";
import { DeleteDocumentModal } from "../components/DeleteDocumentModal";
import { NotebookShell } from "../components/NotebookShell";
import type { Document } from "../types/documents.types";
import { useDocuments, useDocumentStream, useNotebook, useUploadDocument } from "../index";

const allowedExtensions = [".pdf", ".docx", ".txt", ".pptx"];

export function NotebookPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook } = useNotebook(notebookId);
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

  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      canManageDocuments={canManageDocuments}
      isUploading={isUploading}
      deletingDocumentIds={deletingDocumentIds}
      onAddSource={handlePickFile}
      onDeleteDocument={handleDeleteRequest}
      mode="chat"
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={false}
      canStartReports={hasReadySources}
      isGeneratingReports={false}
      canStartMindmap={hasReadySources}
      isGeneratingMindmap={false}
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
      onGoMindmap={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/mindmap`);
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
    </NotebookShell>
  );
}


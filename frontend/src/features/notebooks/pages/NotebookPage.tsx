import { useParams } from "react-router-dom";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ChatArea, useNotebookChat } from "../../notebook-chat";
import { Header } from "../../home/components/Header";
import { documentsApi } from "../api/documentsApi";
import { notebooksApi } from "../api/notebooksApi";
import { DeleteDocumentModal } from "../components/DeleteDocumentModal";
import { SourcesSidebar } from "../components/SourcesSidebar";
import { StudioSidebar } from "../components/StudioSidebar";
import type { Document } from "../types/documents.types";
import type { Notebook } from "../types/notebooks.types";
import { useDocuments, useDocumentStream, useUploadDocument } from "../index";

const allowedExtensions = [".pdf", ".docx", ".txt"];

export function NotebookPage() {
  const { notebookId } = useParams();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
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
    if (streamError) {
      setUseFallback(true);
    }
  }, [streamError]);

  useEffect(() => {
    setUseFallback(false);
    setStreamKey(0);
  }, [notebookId]);

  const documents = useFallback ? fetchedDocuments : streamedDocuments;

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

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
    setDeleteTarget(document);
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

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

  // Simple fetch for title (could be a hook)
  useEffect(() => {
    if (notebookId) {
      notebooksApi.get(notebookId).then(setNotebook).catch(console.error);
    }
  }, [notebookId]);

  const hasReadySources = documents.some((doc) => doc.status === "done");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <Header title={notebook?.title} className="flex-none" />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.txt"
        onChange={handleFileChange}
      />

      {/* Main Layout */}
      <main className="flex flex-1 overflow-hidden">
        <SourcesSidebar
          documents={documents}
          isUploading={isUploading}
          deletingDocumentIds={deletingDocumentIds}
          onAddSource={handlePickFile}
          onDeleteDocument={handleDeleteRequest}
        />
        <div className="flex-1 min-w-0">
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
        </div>
        <StudioSidebar />
      </main>

      <DeleteDocumentModal
        isOpen={Boolean(deleteTarget)}
        documentName={deleteTarget?.file_name}
        isDeleting={
          deleteTarget ? deletingDocumentIds.has(deleteTarget.id) : false
        }
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

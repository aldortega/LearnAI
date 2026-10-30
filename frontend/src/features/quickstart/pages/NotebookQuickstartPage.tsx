import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef } from "react";

import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import type { Document } from "../../notebooks/types/documents.types";
import {
  useNotebook,
  useNotebookReadySources,
  useNotebookStudioSources,
} from "../../notebooks";
import { QuickstartEmptyState } from "../components/QuickstartEmptyState";
import { QuickstartOverview } from "../components/QuickstartOverview";
import { QuickstartShell } from "../components/QuickstartShell";
import { useQuickstartBootstrapState } from "../hooks/useQuickstartBootstrapState";
import { useGenerateQuickstart } from "../hooks/useGenerateQuickstart";
import { useQuickstart } from "../hooks/useQuickstart";
import { NotebookLoadingScreen } from "../../../shared/ui/NotebookLoadingScreen";

export function NotebookQuickstartPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const {
    hasReadySources,
    isResolving: isResolvingReadySources,
  } = useNotebookReadySources(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const hasCheckedLatestJobRef = useRef(false);

  const {
    fileInputRef,
    documents,
    readySignature,
    isUploading,
    deletingDocumentIds,
    deleteTarget,
    setDeleteTarget,
    handleFileChange,
    handleDeleteConfirm,
    pickFile,
  } = useNotebookStudioSources(notebookId);

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
    hasCheckedLatestJobRef.current = false;
  }, [notebookId]);

  const handlePickFile = () => {
    if (!canManageDocuments) return;
    pickFile();
  };

  const handleDeleteRequest = (document: Document) => {
    if (!canManageDocuments) return;
    setDeleteTarget(document);
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

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
      canStartAudio={hasReadySources}
      isGeneratingAudio={false}
      canStartVoice={hasReadySources}
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
      onGoAudio={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/audio`);
      }}
      onGoVoice={() => {
        if (!notebookId) return;
        navigate(`/notebook/${notebookId}/voice`);
      }}
      beforeMain={
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
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
        topicCount={quickstart?.topics.length ?? 0}
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


import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { useNotebook } from "../../notebooks";
import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { GenerateFlashcardsCard } from "../components/GenerateFlashcardsCard";
import { FlashcardsShell } from "../components/FlashcardsShell";
import { RegenerateFlashcardsModal } from "../components/RegenerateFlashcardsModal";
import { FlashcardsStudyView } from "../components/FlashcardsStudyView";
import { useDeleteFlashcards } from "../hooks/useDeleteFlashcards";
import { useFlashcardsNotebookSources } from "../hooks/useFlashcardsNotebookSources";
import { useGenerateFlashcards } from "../hooks/useGenerateFlashcards";
import { useFlashcards } from "../hooks/useFlashcards";
import type { FlashcardsGenerateRequest } from "../types/flashcards.types";

export function NotebookFlashcardsPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const hasCheckedLatestJobRef = useRef(false);
  const [configViewNotebookId, setConfigViewNotebookId] = useState<string | null>(
    null,
  );
  const [generateSessionToken, setGenerateSessionToken] = useState(0);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);

  const {
    fileInputRef,
    documents,
    hasReadySources,
    readySignature,
    isUploading,
    deletingDocumentIds,
    deleteTarget,
    setDeleteTarget,
    handleFileChange,
    handleDeleteConfirm,
    pickFile,
  } = useFlashcardsNotebookSources(notebookId);
  const {
    flashcards,
    isLoading: isFlashcardsLoading,
    error: flashcardsError,
    reload: reloadFlashcards,
  } = useFlashcards(notebookId);
  const {
    generate,
    resumeLatest,
    isGenerating,
    error: generateError,
    clearError: clearGenerateError,
  } = useGenerateFlashcards(notebookId);
  const {
    deleteFlashcards,
    isDeleting: isDeletingFlashcards,
    error: deleteFlashcardsError,
    clearError: clearDeleteFlashcardsError,
  } = useDeleteFlashcards(notebookId);

  useEffect(() => {
    hasCheckedLatestJobRef.current = false;
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) return;
    void reloadFlashcards();
  }, [notebookId, reloadFlashcards, readySignature]);

  useEffect(() => {
    if (!notebookId || hasCheckedLatestJobRef.current) return;
    if (isFlashcardsLoading || isGenerating) return;

    hasCheckedLatestJobRef.current = true;

    void (async () => {
      const result = await resumeLatest({ suppressFailedError: true });
      if (result?.status === "done") {
        await reloadFlashcards();
      }
    })();
  }, [
    notebookId,
    flashcards,
    isFlashcardsLoading,
    isGenerating,
    resumeLatest,
    reloadFlashcards,
  ]);

  const runGeneration = async (options?: FlashcardsGenerateRequest) => {
    if (!notebookId || isGenerating) return;
    clearGenerateError();
    const result = await generate(options);
    if (result?.status === "done") {
      await reloadFlashcards();
      setConfigViewNotebookId(null);
    }
  };

  const isEmpty = !flashcards || flashcards.status === "missing";
  const showGenerationConfig =
    Boolean(notebookId) && configViewNotebookId === notebookId;
  const showGenerationView = isEmpty || showGenerationConfig;
  const combinedError = generateError ?? flashcardsError;
  const canRegenerate = Boolean(flashcards) && !isEmpty;

  const handleRegenerateRequest = () => {
    if (isGenerating) return;
    clearDeleteFlashcardsError();
    setIsRegenerateModalOpen(true);
  };

  const handleRegenerateCancel = () => {
    if (isDeletingFlashcards) return;
    clearDeleteFlashcardsError();
    setIsRegenerateModalOpen(false);
  };

  const handleRegenerateConfirm = async () => {
    if (!notebookId || isGenerating) return;

    const wasDeleted = await deleteFlashcards();
    if (!wasDeleted) return;

    setIsRegenerateModalOpen(false);
    setConfigViewNotebookId(null);
    await reloadFlashcards();
  };

  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      canManageDocuments={canManageDocuments}
      isUploading={isUploading}
      deletingDocumentIds={deletingDocumentIds}
      onAddSource={() => {
        if (!canManageDocuments) return;
        pickFile();
      }}
      onDeleteDocument={(document) => {
        if (!canManageDocuments) return;
        setDeleteTarget(document);
      }}
      mode="flashcards"
      isStudioLocked={false}
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={false}
      canStartReports={hasReadySources}
      isGeneratingReports={false}
      canStartMindmap={hasReadySources}
      isGeneratingMindmap={false}
      canStartFlashcards={hasReadySources}
      isGeneratingFlashcards={isGenerating}
      onGoChat={() => notebookId && navigate(`/notebook/${notebookId}/chat`)}
      onGoQuiz={() => notebookId && navigate(`/notebook/${notebookId}/quiz`)}
      onGoQuickstart={() => notebookId && navigate(`/notebook/${notebookId}/quickstart`)}
      onGoReports={() => notebookId && navigate(`/notebook/${notebookId}/reports`)}
      onGoMindmap={() => notebookId && navigate(`/notebook/${notebookId}/mindmap`)}
      onGoFlashcards={() => undefined}
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
        <>
          <DeleteDocumentModal
            isOpen={Boolean(deleteTarget)}
            documentName={deleteTarget?.file_name}
            isDeleting={deleteTarget ? deletingDocumentIds.has(deleteTarget.id) : false}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDeleteConfirm}
          />
          <RegenerateFlashcardsModal
            isOpen={isRegenerateModalOpen}
            isDeleting={isDeletingFlashcards || isGenerating}
            error={deleteFlashcardsError}
            onCancel={handleRegenerateCancel}
            onConfirm={() => void handleRegenerateConfirm()}
          />
        </>
      }
    >
      <FlashcardsShell
        showAction={hasReadySources || canRegenerate}
        actionType={canRegenerate ? "regenerate" : "settings"}
        canAction={hasReadySources || canRegenerate}
        isActionLoading={isGenerating || isDeletingFlashcards}
        onAction={() => {
          if (!notebookId) return;
          if (canRegenerate) {
            handleRegenerateRequest();
            return;
          }
          clearGenerateError();
          if (showGenerationConfig) {
            setConfigViewNotebookId(null);
            return;
          }
          setConfigViewNotebookId(notebookId);
          setGenerateSessionToken((previous) => previous + 1);
        }}
      >
        {isFlashcardsLoading && !flashcards ? (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">Cargando flashcards...</p>
          </div>
        ) : showGenerationView ? (
          <GenerateFlashcardsCard
            key={`generate-${notebookId ?? "none"}-${generateSessionToken}`}
            isGenerating={isGenerating}
            canGenerate={hasReadySources}
            error={combinedError}
            showConfiguration={showGenerationConfig}
            initialCardCount={flashcards?.card_count ?? "default"}
            initialDifficulty={flashcards?.difficulty ?? "medium"}
            initialTopicPrompt={flashcards?.topic_prompt ?? ""}
            onGenerateDefault={() => {
              void runGeneration();
            }}
            onGenerateCustom={(options) => {
              void runGeneration(options);
            }}
          />
        ) : flashcards ? (
          <FlashcardsStudyView
            key={`${flashcards.generated_at ?? "none"}-${flashcards.cards.length}`}
            flashcards={flashcards}
            error={combinedError}
          />
        ) : null}
      </FlashcardsShell>
    </NotebookShell>
  );
}

import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { useNotebook } from "../../notebooks";
import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { FlashcardSetsList } from "../components/FlashcardSetsList";
import { GenerateFlashcardsCard } from "../components/GenerateFlashcardsCard";
import { FlashcardsShell } from "../components/FlashcardsShell";
import { FlashcardsStudyView } from "../components/FlashcardsStudyView";
import { useFlashcardsNotebookSources } from "../hooks/useFlashcardsNotebookSources";
import { useGenerateFlashcards } from "../hooks/useGenerateFlashcards";
import { useFlashcards } from "../hooks/useFlashcards";
import type { FlashcardsGenerateRequest } from "../types/flashcards.types";

export function NotebookFlashcardsPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const hasCheckedLatestJobRef = useRef(false);
  const [viewMode, setViewMode] = useState<"sets" | "study" | "generate">("sets");
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [studyEntry, setStudyEntry] = useState<"first" | "last">("first");
  const [generateSessionToken, setGenerateSessionToken] = useState(0);

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
      setViewMode("sets");
    }
  };

  const sets = useMemo(() => flashcards?.sets ?? [], [flashcards]);
  const isEmpty = sets.length === 0;
  const effectiveViewMode = isEmpty ? "generate" : viewMode;
  const latestSet = sets[sets.length - 1] ?? null;
  const selectedSet = useMemo(
    () => sets.find((setItem) => setItem.set_id === selectedSetId) ?? null,
    [selectedSetId, sets],
  );
  const selectedSetIndex = selectedSet
    ? sets.findIndex((setItem) => setItem.set_id === selectedSet.set_id)
    : -1;
  const nextSetId =
    selectedSetIndex >= 0 && selectedSetIndex < sets.length - 1
      ? sets[selectedSetIndex + 1].set_id
      : null;
  const previousSetId =
    selectedSetIndex > 0
      ? sets[selectedSetIndex - 1].set_id
      : null;

  const combinedError = generateError ?? flashcardsError;

  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      canManageDocuments={canManageDocuments}
      isNotebookLoading={isNotebookLoading}
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
      canStartPresentations={hasReadySources}
      isGeneratingPresentations={false}
      canStartMindmap={hasReadySources}
      isGeneratingMindmap={false}
      canStartFlashcards={hasReadySources}
      isGeneratingFlashcards={isGenerating}
      canStartAudio={hasReadySources}
      isGeneratingAudio={false}
      canStartVoice={hasReadySources}
      onGoChat={() => notebookId && navigate(`/notebook/${notebookId}/chat`)}
      onGoQuiz={() => notebookId && navigate(`/notebook/${notebookId}/quiz`)}
      onGoQuickstart={() => notebookId && navigate(`/notebook/${notebookId}/quickstart`)}
      onGoReports={() => notebookId && navigate(`/notebook/${notebookId}/reports`)}
      onGoPresentations={() =>
        notebookId && navigate(`/notebook/${notebookId}/presentations`)
      }
      onGoMindmap={() => notebookId && navigate(`/notebook/${notebookId}/mindmap`)}
      onGoFlashcards={() => undefined}
      onGoAudio={() => notebookId && navigate(`/notebook/${notebookId}/audio`)}
      onGoVoice={() => notebookId && navigate(`/notebook/${notebookId}/voice`)}
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
        </>
      }
    >
      <FlashcardsShell
        showSetsAction={sets.length > 0 && effectiveViewMode !== "sets"}
        canSetsAction={sets.length > 0}
        onSetsAction={() => {
          setViewMode("sets");
          setSelectedSetId(null);
        }}
        showAction={hasReadySources}
        actionType="settings"
        canAction={hasReadySources}
        isActionLoading={isGenerating}
        onAction={() => {
          if (!notebookId) return;
          clearGenerateError();
          if (effectiveViewMode === "generate") {
            setViewMode(isEmpty ? "generate" : "sets");
            return;
          }
          setViewMode("generate");
          setGenerateSessionToken((previous) => previous + 1);
        }}
      >
        {isFlashcardsLoading && !flashcards ? (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">Cargando flashcards...</p>
          </div>
        ) : effectiveViewMode === "generate" ? (
          <GenerateFlashcardsCard
            key={`generate-${notebookId ?? "none"}-${generateSessionToken}`}
            isGenerating={isGenerating}
            canGenerate={hasReadySources}
            error={combinedError}
            showConfiguration
            initialCardCount={latestSet?.card_count ?? "default"}
            initialDifficulty={latestSet?.difficulty ?? "medium"}
            initialTopicPrompt={latestSet?.topic_prompt ?? ""}
            onGenerateDefault={() => {
              void runGeneration();
            }}
            onGenerateCustom={(options) => {
              void runGeneration(options);
            }}
          />
        ) : effectiveViewMode === "sets" || !selectedSet ? (
          <FlashcardSetsList
            sets={sets}
            onSelectSet={(setId) => {
              setStudyEntry("first");
              setSelectedSetId(setId);
              setViewMode("study");
            }}
          />
        ) : selectedSet ? (
          <FlashcardsStudyView
            key={`${selectedSet.set_id}-${selectedSet.cards.length}-${studyEntry}`}
            notebookId={flashcards?.notebook_id ?? notebookId ?? ""}
            flashcardSet={selectedSet}
            initialCardIndex={
              studyEntry === "last" ? Math.max(selectedSet.cards.length - 1, 0) : 0
            }
            error={combinedError}
            hasPreviousSet={Boolean(previousSetId)}
            onGoToPreviousSet={() => {
              if (!previousSetId) return;
              setStudyEntry("last");
              setSelectedSetId(previousSetId);
            }}
            hasNextSet={Boolean(nextSetId)}
            onGoToNextSet={() => {
              if (!nextSetId) return;
              setStudyEntry("first");
              setSelectedSetId(nextSetId);
            }}
          />
        ) : null}
      </FlashcardsShell>
    </NotebookShell>
  );
}

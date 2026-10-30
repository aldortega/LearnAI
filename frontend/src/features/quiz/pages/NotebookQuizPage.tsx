import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import type { Document } from "../../notebooks/types/documents.types";
import { useNotebook, useNotebookStudioSources } from "../../notebooks";
import { GenerateQuizCard } from "../components/GenerateQuizCard";
import { QuizArea } from "../components/QuizArea";
import { RegenerateQuizModal } from "../components/RegenerateQuizModal";
import { RoadmapView } from "../components/RoadmapView";
import { QuizShell } from "../components/QuizShell";
import { useDeleteQuizRoadmap } from "../hooks/useDeleteQuizRoadmap";
import { useGenerateQuizRoadmap } from "../hooks/useGenerateQuizRoadmap";
import { useLevelEntry } from "../hooks/useLevelEntry";
import { useQuizRoadmap } from "../hooks/useQuizRoadmap";
import { useResetQuizAttempts } from "../hooks/useResetQuizAttempts";
import type { QuizGenerateRequest } from "../types/quiz.types";

export function NotebookQuizPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const hasCheckedLatestJobRef = useRef(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);

  const {
    fileInputRef,
    documents,
    hasReadySources,
    isUploading,
    deletingDocumentIds,
    deleteTarget,
    setDeleteTarget,
    handleFileChange,
    handleDeleteConfirm,
    pickFile,
  } = useNotebookStudioSources(notebookId);

  useEffect(() => {
    hasCheckedLatestJobRef.current = false;
  }, [notebookId]);

  const {
    roadmap,
    isLoading: isRoadmapLoading,
    error: roadmapError,
    reload: reloadRoadmap,
  } = useQuizRoadmap(notebookId);

  const { generate, resumeLatest, isGenerating, error: generateError } =
    useGenerateQuizRoadmap(notebookId);
  const { reset: resetAttempts } = useResetQuizAttempts(notebookId);
  const {
    deleteRoadmap: deleteQuizRoadmap,
    isDeleting: isDeletingRoadmap,
    error: deleteRoadmapError,
    clearError: clearDeleteRoadmapError,
  } = useDeleteQuizRoadmap(notebookId);

  const handlePickFile = () => {
    if (!canManageDocuments) return;
    pickFile();
  };

  const handleDeleteRequest = (documentItem: Document) => {
    if (!canManageDocuments) return;
    setDeleteTarget(documentItem);
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleGoChat = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/chat`);
  };

  const handleGoQuiz = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/quiz`);
  };

  const handleGoQuickstart = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/quickstart`);
  };

  const handleGoReports = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/reports`);
  };

  const handleGoMindmap = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/mindmap`);
  };

  const handleGoPresentations = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/presentations`);
  };

  const handleGoFlashcards = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/flashcards`);
  };

  const handleGenerateQuiz = useCallback(
    async (options: QuizGenerateRequest) => {
      if (!notebookId) return;

      const result = await generate(options);
      if (result) {
        await reloadRoadmap();
      }
    },
    [generate, notebookId, reloadRoadmap],
  );

  const handleRegenerateRequest = useCallback(() => {
    clearDeleteRoadmapError();
    setIsRegenerateModalOpen(true);
  }, [clearDeleteRoadmapError]);

  const handleRegenerateCancel = useCallback(() => {
    if (isDeletingRoadmap) return;
    clearDeleteRoadmapError();
    setIsRegenerateModalOpen(false);
  }, [clearDeleteRoadmapError, isDeletingRoadmap]);

  const handleRegenerateConfirm = useCallback(async () => {
    if (!notebookId) return;

    const wasDeleted = await deleteQuizRoadmap();
    if (!wasDeleted) return;

    setIsRegenerateModalOpen(false);
    navigate(`/notebook/${notebookId}/quiz`);
    await reloadRoadmap();
  }, [deleteQuizRoadmap, navigate, notebookId, reloadRoadmap]);

  const [retryingLevelId, setRetryingLevelId] = useState<string | null>(null);

  const handleEnterLevel = useCallback(
    (selectedId: string) => {
      if (!notebookId) return;
      navigate(`/notebook/${notebookId}/quiz?level=${selectedId}`);
    },
    [navigate, notebookId],
  );

  const {
    preparingLevelId,
    error: levelEntryError,
    selectLevel,
  } = useLevelEntry({
    notebookId,
    roadmap,
    reloadRoadmap,
    onEnter: handleEnterLevel,
  });

  const handleRetryLevel = useCallback(
    async (levelId: string) => {
      if (!notebookId) return;

      setRetryingLevelId(levelId);
      const result = await resetAttempts(levelId);
      if (result) {
        await reloadRoadmap();
        navigate(`/notebook/${notebookId}/quiz?level=${levelId}`);
      }
      setRetryingLevelId(null);
    },
    [notebookId, resetAttempts, reloadRoadmap, navigate],
  );


  useEffect(() => {
    if (!notebookId) return;
    void reloadRoadmap();
  }, [notebookId, reloadRoadmap]);

  useEffect(() => {
    if (!notebookId || hasCheckedLatestJobRef.current) return;
    if (roadmap || isRoadmapLoading || isGenerating) return;

    hasCheckedLatestJobRef.current = true;

    void (async () => {
      const result = await resumeLatest({ suppressFailedError: true });
      if (result?.status === "done") {
        await reloadRoadmap();
      }
    })();
  }, [
    notebookId,
    roadmap,
    isRoadmapLoading,
    isGenerating,
    resumeLatest,
    reloadRoadmap,
  ]);

  const levelId = searchParams.get("level");
  const isInLevel = Boolean(roadmap && levelId);

  const previousLevelIdRef = useRef(levelId);
  useEffect(() => {
    if (previousLevelIdRef.current === levelId) return;
    previousLevelIdRef.current = levelId;
    void reloadRoadmap();
  }, [levelId, reloadRoadmap]);
  const selectedLevelTitle = useMemo(() => {
    if (!roadmap || !levelId) return null;

    for (const unit of roadmap.units) {
      const level = unit.levels.find((item) => item.id === levelId);
      if (level) return level.title;
    }

    return null;
  }, [roadmap, levelId]);

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
      mode="quiz"
      isStudioLocked={false}
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={isGenerating}
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
      canStartAudio={hasReadySources}
      isGeneratingAudio={false}
      canStartVoice={hasReadySources}
      onGoChat={handleGoChat}
      onGoQuiz={() => void handleGoQuiz()}
      onGoQuickstart={handleGoQuickstart}
      onGoReports={handleGoReports}
      onGoPresentations={handleGoPresentations}
      onGoMindmap={handleGoMindmap}
      onGoFlashcards={handleGoFlashcards}
      onGoAudio={() => notebookId && navigate(`/notebook/${notebookId}/audio`)}
      onGoVoice={() => notebookId && navigate(`/notebook/${notebookId}/voice`)}
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
        <>
          <DeleteDocumentModal
            isOpen={Boolean(deleteTarget)}
            documentName={deleteTarget?.file_name}
            isDeleting={
              deleteTarget ? deletingDocumentIds.has(deleteTarget.id) : false
            }
            onCancel={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
          />
          <RegenerateQuizModal
            isOpen={isRegenerateModalOpen}
            isDeleting={isDeletingRoadmap}
            error={deleteRoadmapError}
            onCancel={handleRegenerateCancel}
            onConfirm={() => void handleRegenerateConfirm()}
          />
        </>
      }
    >
      <QuizShell
        title="Quiz"
        levelTitle={isInLevel ? (selectedLevelTitle ?? "Nivel") : undefined}
        showRegenerateAction={Boolean(roadmap) && !isInLevel}
        canRegenerate={Boolean(roadmap)}
        isRegenerating={isGenerating || isDeletingRoadmap}
        onRegenerate={handleRegenerateRequest}
        showBackToRoadmapAction={isInLevel}
        onBackToRoadmap={() => {
          if (!notebookId) return;
          navigate(`/notebook/${notebookId}/quiz`);
        }}
      >
        {roadmap && levelId ? (
          <QuizArea
            notebookId={notebookId ?? ""}
            levelId={levelId}
            onReloadRoadmap={async () => {
              await reloadRoadmap();
            }}
          />
        ) : roadmap ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="mx-auto max-w-5xl">
            {levelEntryError ? (
              <p role="alert" className="mb-4 text-sm text-error">
                {levelEntryError}
              </p>
            ) : null}
            <RoadmapView
              roadmap={roadmap}
              selectedLevelId={null}
              onSelectLevel={selectLevel}
              onRetryLevel={handleRetryLevel}
              retryingLevelId={retryingLevelId}
              preparingLevelId={preparingLevelId}
            />
            </div>
          </div>
        ) : (
          <GenerateQuizCard
            isGenerating={isGenerating}
            canStartQuiz={hasReadySources}
            error={generateError ?? roadmapError}
            onGenerate={(options) => void handleGenerateQuiz(options)}
          />
        )}
      </QuizShell>
    </NotebookShell>
  );
}


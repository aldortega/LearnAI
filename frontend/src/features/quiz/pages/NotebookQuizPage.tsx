import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { documentsApi } from "../../notebooks/api/documentsApi";
import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import type { Document } from "../../notebooks/types/documents.types";
import { useDocuments, useDocumentStream, useNotebook, useUploadDocument } from "../../notebooks";
import { GenerateQuizCard } from "../components/GenerateQuizCard";
import { QuizArea } from "../components/QuizArea";
import { RoadmapView } from "../components/RoadmapView";
import { QuizShell } from "../components/QuizShell";
import { useGenerateQuizRoadmap } from "../hooks/useGenerateQuizRoadmap";
import { useQuizRoadmap } from "../hooks/useQuizRoadmap";
import { useResetQuizAttempts } from "../hooks/useResetQuizAttempts";
import type { QuizGenerateRequest } from "../types/quiz.types";

const allowedExtensions = [".pdf", ".docx", ".txt"];

export function NotebookQuizPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notebook } = useNotebook(notebookId);
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

  const hasReadySources = useMemo(
    () => documents.some((doc) => doc.status === "done"),
    [documents],
  );

  const {
    roadmap,
    isLoading: isRoadmapLoading,
    error: roadmapError,
    reload: reloadRoadmap,
  } = useQuizRoadmap(notebookId);

  const { generate, resumeLatest, isGenerating, error: generateError } =
    useGenerateQuizRoadmap(notebookId);
  const { reset: resetAttempts } = useResetQuizAttempts(notebookId);

  const fileInputRef = useRef<HTMLInputElement>(null);



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
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    await processFileUpload(file);
  };

  const handleDeleteRequest = (documentItem: Document) => {
    setDeleteTarget(documentItem);
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

  const handleGoChat = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/chat`);
  };

  const handleGoQuiz = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/quiz`);
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

  const [retryingLevelId, setRetryingLevelId] = useState<string | null>(null);

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
      const result = await resumeLatest();
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
      isUploading={isUploading}
      deletingDocumentIds={deletingDocumentIds}
      onAddSource={handlePickFile}
      onDeleteDocument={handleDeleteRequest}
      mode="quiz"
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={isGenerating || (isRoadmapLoading && !roadmap)}
      onGoChat={handleGoChat}
      onGoQuiz={() => void handleGoQuiz()}
      beforeMain={
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt"
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
      <QuizShell>
        {roadmap && levelId ? (
          <QuizArea
            notebookId={notebookId ?? ""}
            levelId={levelId}
            levelTitle={selectedLevelTitle ?? "Nivel"}
            onReloadRoadmap={async () => {
              await reloadRoadmap();
            }}
          />
        ) : roadmap ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="mx-auto max-w-5xl">
            <RoadmapView
              roadmap={roadmap}
              selectedLevelId={null}
              onSelectLevel={(selectedId) => {
                if (!notebookId) return;
                navigate(`/notebook/${notebookId}/quiz?level=${selectedId}`);
              }}
              onRetryLevel={handleRetryLevel}
              retryingLevelId={retryingLevelId}
            />
            </div>
          </div>
        ) : (
          <GenerateQuizCard
            isGenerating={isGenerating || isRoadmapLoading}
            canStartQuiz={hasReadySources}
            error={generateError ?? roadmapError}
            onGenerate={(options) => void handleGenerateQuiz(options)}
          />
        )}
      </QuizShell>
    </NotebookShell>
  );
}

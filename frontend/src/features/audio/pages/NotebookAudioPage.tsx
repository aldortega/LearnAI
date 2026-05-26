import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Headphones, Plus } from "lucide-react";

import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { useNotebook } from "../../notebooks/hooks/useNotebook";
import { useNotebookStudioSources } from "../../notebooks/hooks/useNotebookStudioSources";
import { AudioGenerationOverlay } from "../components/AudioGenerationOverlay";
import { AudioGeneratePanel } from "../components/AudioGeneratePanel";
import { AudioShell } from "../components/AudioShell";
import { DeletePodcastModal } from "../components/DeletePodcastModal";
import { PodcastHistoryList } from "../components/PodcastHistoryList";
import { useAudioConfig } from "../hooks/useAudioConfig";
import { useAudioHistory } from "../hooks/useAudioHistory";
import { useAudioStudioNav } from "../hooks/useAudioStudioNav";
import { useDeletePodcast } from "../hooks/useDeletePodcast";
import { useGenerateAudio } from "../hooks/useGenerateAudio";
import { useGenerateAudioSuggestions } from "../hooks/useGenerateAudioSuggestions";
import type {
  AudioDuration,
  AudioFormatType,
  AudioSuggestion,
  PodcastOut,
} from "../types/audio.types";

type ViewMode = "create" | "history";

export function NotebookAudioPage() {
  const { notebookId } = useParams();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;

  const nav = useAudioStudioNav(notebookId);
  const {
    fileInputRef,
    documents,
    hasReadySources,
    isUploading,
    deletingDocumentIds,
    deleteTarget: sourceDeleteTarget,
    setDeleteTarget: setSourceDeleteTarget,
    handleFileChange,
    handleDeleteConfirm,
    pickFile,
  } = useNotebookStudioSources(notebookId);
  const { config, isLoading: isConfigLoading, reload: reloadConfig } =
    useAudioConfig(notebookId);
  const {
    podcasts,
    isLoading: isHistoryLoading,
    hasResolved: hasHistoryResolved,
    error: historyError,
    reload: reloadHistory,
    removePodcast,
  } = useAudioHistory(notebookId);
  const {
    generate,
    resumeLatest,
    isGenerating,
    error: generateError,
    clearError: clearGenerateError,
  } = useGenerateAudio(notebookId);
  const {
    generate: generateSuggestions,
    isGenerating: isGeneratingSuggestions,
    error: suggestionsError,
    clearError: clearSuggestionsError,
  } = useGenerateAudioSuggestions(notebookId);
  const {
    deletePodcast,
    deletingPodcastId,
    error: deletePodcastError,
    clearError: clearDeleteError,
  } = useDeletePodcast(notebookId);

  const [viewMode, setViewMode] = useState<ViewMode>("history");
  const [selectedFormat, setSelectedFormat] = useState<AudioFormatType | null>(
    null,
  );
  const [selectedDuration, setSelectedDuration] = useState<AudioDuration>(
    "default",
  );
  const [topic, setTopic] = useState("");
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<PodcastOut | null>(null);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const [lastNotebookId, setLastNotebookId] = useState(notebookId);
  const hasCheckedLatestJobRef = useRef(false);
  const hasTriggeredAutoSuggestionsRef = useRef(false);
  const hasResolvedInitialViewRef = useRef(false);

  if (notebookId !== lastNotebookId) {
    setLastNotebookId(notebookId);
    setViewMode("history");
    setSelectedFormat(null);
    setSelectedDuration("default");
    setTopic("");
    setSelectedSuggestionId(null);
    setDeleteTarget(null);
  }

  useEffect(() => {
    hasCheckedLatestJobRef.current = false;
    hasTriggeredAutoSuggestionsRef.current = false;
    hasResolvedInitialViewRef.current = false;
  }, [notebookId]);

  const templates = useMemo(() => config?.templates ?? [], [config]);
  const suggestions = useMemo(() => config?.suggestions ?? [], [config]);
  const canGenerate = config?.has_ready_sources ?? hasReadySources;
  const suggestionsStatus = config?.suggestions_status ?? "missing";
  const suggestionsAreStale = config?.suggestions_is_stale ?? false;
  const isSuggestionsLoading =
    isConfigLoading ||
    isRefreshingSuggestions ||
    isGeneratingSuggestions ||
    suggestionsStatus === "generating";

  useEffect(() => {
    if (!notebookId || hasCheckedLatestJobRef.current) return;
    if (isGenerating || isHistoryLoading) return;
    hasCheckedLatestJobRef.current = true;
    void (async () => {
      const result = await resumeLatest({ suppressFailedError: true });
      if (result?.status !== "done") return;
      await reloadHistory();
    })();
  }, [notebookId, isGenerating, isHistoryLoading, reloadHistory, resumeLatest]);

  useEffect(() => {
    if (!notebookId || !config) return;
    if (hasTriggeredAutoSuggestionsRef.current) return;
    if (isConfigLoading || isGeneratingSuggestions || !canGenerate) return;
    if (suggestionsStatus !== "missing" && !suggestionsAreStale) return;
    hasTriggeredAutoSuggestionsRef.current = true;
    void (async () => {
      clearSuggestionsError();
      await generateSuggestions();
      await reloadConfig();
    })();
  }, [
    notebookId,
    config,
    isConfigLoading,
    isGeneratingSuggestions,
    canGenerate,
    suggestionsStatus,
    suggestionsAreStale,
    clearSuggestionsError,
    generateSuggestions,
    reloadConfig,
  ]);

  useEffect(() => {
    if (!notebookId || isHistoryLoading) return;
    if (hasResolvedInitialViewRef.current) return;
    hasResolvedInitialViewRef.current = true;
    setViewMode(podcasts.length === 0 ? "create" : "history");
  }, [notebookId, isHistoryLoading, podcasts.length]);

  const handleSelectSuggestion = useCallback((suggestion: AudioSuggestion) => {
    setTopic(suggestion.default_topic);
    setSelectedSuggestionId(suggestion.id);
  }, []);

  const handleRefreshSuggestions = useCallback(async () => {
    if (!notebookId || isRefreshingSuggestions || isGeneratingSuggestions) return;
    setIsRefreshingSuggestions(true);
    try {
      clearSuggestionsError();
      await generateSuggestions();
      await reloadConfig();
    } finally {
      setIsRefreshingSuggestions(false);
    }
  }, [
    notebookId,
    isRefreshingSuggestions,
    isGeneratingSuggestions,
    clearSuggestionsError,
    generateSuggestions,
    reloadConfig,
  ]);

  const handleGenerate = useCallback(async () => {
    if (!notebookId || !selectedFormat || !canGenerate) return;
    clearGenerateError();
    setViewMode("history");
    const result = await generate({
      format_type: selectedFormat,
      duration: selectedDuration,
      topic: topic.trim() ? topic.trim() : undefined,
      suggestion_id: selectedSuggestionId ?? undefined,
    });
    if (!result) return;
    await reloadHistory();
  }, [
    notebookId,
    selectedFormat,
    selectedDuration,
    topic,
    selectedSuggestionId,
    canGenerate,
    clearGenerateError,
    generate,
    reloadHistory,
  ]);

  const handleDeletePodcastConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const deleted = await deletePodcast(deleteTarget.id);
    if (!deleted) return;
    removePodcast(deleteTarget.id);
    setDeleteTarget(null);
    await reloadHistory();
  }, [deleteTarget, deletePodcast, removePodcast, reloadHistory]);

  const blockedReason = !canGenerate
    ? "Necesitas al menos una fuente lista para generar audios."
    : null;

  const headerAction = (
    <button
      type="button"
      onClick={() =>
        setViewMode((prev) => (prev === "create" ? "history" : "create"))
      }
      className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={viewMode === "create" ? "Ver historial" : "Crear podcast"}
      title={viewMode === "create" ? "Ver historial" : "Crear podcast"}
    >
      {viewMode === "create" ? (
        <Headphones className="h-4 w-4" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
    </button>
  );

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
        setSourceDeleteTarget(document);
      }}
      mode="audio"
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
      isGeneratingFlashcards={false}
      canStartAudio={hasReadySources}
      isGeneratingAudio={isGenerating}
      canStartVoice={hasReadySources}
      onGoChat={nav.goChat}
      onGoQuiz={nav.goQuiz}
      onGoQuickstart={nav.goQuickstart}
      onGoReports={nav.goReports}
      onGoPresentations={nav.goPresentations}
      onGoMindmap={nav.goMindmap}
      onGoFlashcards={nav.goFlashcards}
      onGoAudio={nav.goAudio}
      onGoVoice={nav.goVoice}
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
            isOpen={Boolean(sourceDeleteTarget)}
            documentName={sourceDeleteTarget?.file_name}
            isDeleting={
              sourceDeleteTarget
                ? deletingDocumentIds.has(sourceDeleteTarget.id)
                : false
            }
            onCancel={() => setSourceDeleteTarget(null)}
            onConfirm={handleDeleteConfirm}
          />
          <DeletePodcastModal
            isOpen={Boolean(deleteTarget)}
            podcastTitle={deleteTarget?.title}
            isDeleting={deletingPodcastId === deleteTarget?.id}
            error={deletePodcastError}
            onCancel={() => {
              clearDeleteError();
              setDeleteTarget(null);
            }}
            onConfirm={handleDeletePodcastConfirm}
          />
        </>
      }
    >
      <AudioShell headerAction={headerAction}>
        <div className="relative h-full overflow-y-auto p-6">
          <AudioGenerationOverlay
            isVisible={isGenerating}
            message="Generando podcast..."
          />
          <div className="mx-auto w-full max-w-4xl">
            {viewMode === "create" ? (
              <AudioGeneratePanel
                templates={templates}
                suggestions={suggestions}
                selectedFormat={selectedFormat}
                selectedDuration={selectedDuration}
                topic={topic}
                disabled={isGenerating || !canGenerate}
                isGenerating={isGenerating}
                isRefreshingSuggestions={isRefreshingSuggestions || isGeneratingSuggestions}
                isSuggestionsLoading={isSuggestionsLoading}
                isSuggestionsStale={suggestionsAreStale && suggestions.length > 0}
                canGenerate={Boolean(selectedFormat) && canGenerate && !isGenerating}
                generationError={generateError}
                suggestionsError={suggestionsError ?? config?.suggestions_error ?? null}
                blockedReason={blockedReason}
                onSelectFormat={(format) => {
                  setSelectedFormat(format);
                  setSelectedSuggestionId(null);
                }}
                onSelectDuration={setSelectedDuration}
                onTopicChange={(value) => {
                  setTopic(value);
                  setSelectedSuggestionId(null);
                }}
                onSelectSuggestion={handleSelectSuggestion}
                onRefreshSuggestions={handleRefreshSuggestions}
                onGenerate={handleGenerate}
              />
            ) : (
              <div className="space-y-4">
                {historyError ? (
                  <p className="text-sm text-error" role="alert">
                    {historyError}
                  </p>
                ) : null}
                <PodcastHistoryList
                  podcasts={podcasts}
                  isLoading={isHistoryLoading}
                  hasResolved={hasHistoryResolved}
                  isGenerating={isGenerating}
                  deletingPodcastId={deletingPodcastId}
                  onDeletePodcast={(podcast) => {
                    clearDeleteError();
                    setDeleteTarget(podcast);
                  }}
                />
                {podcasts.length === 0 && hasHistoryResolved && !isHistoryLoading ? (
                  <button
                    type="button"
                    onClick={() => setViewMode("create")}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Crear primer podcast
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </AudioShell>
    </NotebookShell>
  );
}

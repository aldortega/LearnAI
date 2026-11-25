import {
  BookOpenCheck,
  FileText,
  Headphones,
  Layers,
  MessageSquare,
  Mic,
  Network,
  Presentation,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

import {
  buildActivityKey,
  useGenerationActivity,
} from "../../../shared/generation/context";
import type { GenerationKind } from "../../../shared/generation/types";

export type StudioMode =
  | "chat"
  | "quiz"
  | "quickstart"
  | "reports"
  | "presentations"
  | "mindmap"
  | "flashcards"
  | "audio"
  | "voice";

export type StudioModeOptions = {
  mode: StudioMode;
  isStudioLocked: boolean;
  canStartQuiz: boolean;
  isGeneratingQuiz: boolean;
  canStartQuickstart: boolean;
  isGeneratingQuickstart: boolean;
  canStartReports: boolean;
  isGeneratingReports: boolean;
  canStartPresentations: boolean;
  isGeneratingPresentations: boolean;
  canStartMindmap: boolean;
  isGeneratingMindmap: boolean;
  canStartFlashcards: boolean;
  isGeneratingFlashcards: boolean;
  canStartAudio?: boolean;
  isGeneratingAudio?: boolean;
  canStartVoice?: boolean;
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
  onGoReports: () => void;
  onGoPresentations: () => void;
  onGoMindmap: () => void;
  onGoFlashcards: () => void;
  onGoAudio?: () => void;
  onGoVoice?: () => void;
};

export type StudioModeItem = {
  key: StudioMode;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  isActive: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  isReady: boolean;
  needsSource: boolean;
  hint: string;
};

export const NEEDS_SOURCE_HINT = "Necesitás al menos una fuente lista";

const noop = () => undefined;

const generationKindByMode: Partial<Record<StudioMode, GenerationKind>> = {
  quickstart: "quickstart",
  quiz: "quiz_roadmap",
  mindmap: "mindmap",
  flashcards: "flashcards",
  presentations: "presentations",
  reports: "reports",
  audio: "audio",
};

export function useStudioModeItems({
  mode,
  isStudioLocked,
  canStartQuiz,
  isGeneratingQuiz,
  canStartQuickstart,
  isGeneratingQuickstart,
  canStartReports,
  isGeneratingReports,
  canStartPresentations,
  isGeneratingPresentations,
  canStartMindmap,
  isGeneratingMindmap,
  canStartFlashcards,
  isGeneratingFlashcards,
  canStartAudio = false,
  isGeneratingAudio = false,
  canStartVoice = false,
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
  onGoReports,
  onGoPresentations,
  onGoMindmap,
  onGoFlashcards,
  onGoAudio,
  onGoVoice,
}: StudioModeOptions): StudioModeItem[] {
  const activeMode: StudioMode | null = isStudioLocked ? null : mode;
  const { notebookId } = useParams();
  const { activeKeys, completedKeys, acknowledgeCompletion } = useGenerationActivity();
  const activeKind = activeMode ? generationKindByMode[activeMode] : undefined;
  const activeCompletionKey =
    notebookId && activeKind ? buildActivityKey(notebookId, activeKind) : null;
  const isActiveKindCompleted =
    activeCompletionKey !== null && completedKeys.has(activeCompletionKey);

  useEffect(() => {
    if (!notebookId || !activeKind || !isActiveKindCompleted) return;
    acknowledgeCompletion(notebookId, activeKind);
  }, [acknowledgeCompletion, activeKind, isActiveKindCompleted, notebookId]);

  const isModeGenerating = (key: StudioMode): boolean => {
    const kind = generationKindByMode[key];
    if (!notebookId || !kind) return false;
    return activeKeys.has(buildActivityKey(notebookId, kind));
  };

  const isModeReady = (key: StudioMode): boolean => {
    const kind = generationKindByMode[key];
    if (!notebookId || !kind || activeMode === key) return false;
    return completedKeys.has(buildActivityKey(notebookId, kind));
  };
  const baseItems = [
    { key: "quickstart" as const, label: "Inicio rápido", icon: Rocket, onClick: onGoQuickstart, canStart: canStartQuickstart, loading: isGeneratingQuickstart },
    { key: "chat" as const, label: "Chat", icon: MessageSquare, onClick: onGoChat, canStart: true, loading: false },
    { key: "mindmap" as const, label: "Mapa mental", icon: Network, onClick: onGoMindmap, canStart: canStartMindmap, loading: isGeneratingMindmap },
    { key: "quiz" as const, label: "Quiz", icon: BookOpenCheck, onClick: onGoQuiz, canStart: canStartQuiz, loading: isGeneratingQuiz },
    { key: "flashcards" as const, label: "Flashcards", icon: Layers, onClick: onGoFlashcards, canStart: canStartFlashcards, loading: isGeneratingFlashcards },
    { key: "reports" as const, label: "Informes", icon: FileText, onClick: onGoReports, canStart: canStartReports, loading: isGeneratingReports },
    { key: "presentations" as const, label: "Presentaciones", icon: Presentation, onClick: onGoPresentations, canStart: canStartPresentations, loading: isGeneratingPresentations },
    { key: "audio" as const, label: "Audios", icon: Headphones, onClick: onGoAudio ?? noop, canStart: canStartAudio && Boolean(onGoAudio), loading: isGeneratingAudio },
    { key: "voice" as const, label: "Voz", icon: Mic, onClick: onGoVoice ?? noop, canStart: canStartVoice && Boolean(onGoVoice), loading: false },
  ];

  return baseItems.map((rawItem) => {
    const item = { ...rawItem, loading: rawItem.loading || isModeGenerating(rawItem.key) };
    const isReady = !item.loading && isModeReady(item.key);
    const needsSource =
      !isStudioLocked && !item.canStart && item.key !== "audio" && item.key !== "voice";
    return {
      key: item.key,
      label: item.label,
      icon: item.icon,
      onClick: item.onClick,
      isActive: activeMode === item.key,
      isDisabled: isStudioLocked || !item.canStart || item.loading,
      isLoading: item.loading,
      isReady,
      needsSource,
      hint: item.loading
        ? `${item.label} · generando…`
        : isReady
          ? `${item.label} · listo`
          : needsSource
          ? `${item.label} · ${NEEDS_SOURCE_HINT}`
          : item.label,
    };
  });
}

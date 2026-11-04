import {
  BookOpenCheck,
  FileText,
  Headphones,
  Mic,
  Presentation,
  Layers,
  MessageSquare,
  Network,
  Sparkles,
} from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import { Spinner } from "../../../shared/ui/Spinner";

type Mode =
  | "chat"
  | "quiz"
  | "quickstart"
  | "reports"
  | "presentations"
  | "mindmap"
  | "flashcards"
  | "audio"
  | "voice";

type Props = {
  mode: Mode;
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

const NEEDS_SOURCE_HINT = "Necesitás al menos una fuente lista";

export function StudioRail({
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
}: Props) {
  const activeMode: Mode | null = isStudioLocked ? null : mode;
  const items = [
    { key: "quickstart" as const, label: "Inicio rápido", icon: Sparkles, onClick: onGoQuickstart, canStart: canStartQuickstart, loading: isGeneratingQuickstart },
    { key: "chat" as const, label: "Chat", icon: MessageSquare, onClick: onGoChat, canStart: true, loading: false },
    { key: "mindmap" as const, label: "Mapa mental", icon: Network, onClick: onGoMindmap, canStart: canStartMindmap, loading: isGeneratingMindmap },
    { key: "quiz" as const, label: "Quiz", icon: BookOpenCheck, onClick: onGoQuiz, canStart: canStartQuiz, loading: isGeneratingQuiz },
    { key: "flashcards" as const, label: "Flashcards", icon: Layers, onClick: onGoFlashcards, canStart: canStartFlashcards, loading: isGeneratingFlashcards },
    { key: "reports" as const, label: "Informes", icon: FileText, onClick: onGoReports, canStart: canStartReports, loading: isGeneratingReports },
    { key: "presentations" as const, label: "Presentaciones", icon: Presentation, onClick: onGoPresentations, canStart: canStartPresentations, loading: isGeneratingPresentations },
    { key: "audio" as const, label: "Audios", icon: Headphones, onClick: onGoAudio ?? (() => undefined), canStart: canStartAudio && Boolean(onGoAudio), loading: isGeneratingAudio },
    { key: "voice" as const, label: "Voz", icon: Mic, onClick: onGoVoice ?? (() => undefined), canStart: canStartVoice && Boolean(onGoVoice), loading: false },
  ];

  return (
    <nav
      aria-label="Modos de estudio"
      className="flex h-full w-16 flex-none flex-col items-center gap-1 border-r border-border bg-muted py-3"
    >
      {items.map((item) => {
        const isActive = activeMode === item.key;
        const isDisabled = isStudioLocked || !item.canStart || item.loading;
        const hint = item.loading
          ? `${item.label} · generando…`
          : !isStudioLocked && !item.canStart && item.key !== "audio" && item.key !== "voice"
            ? `${item.label} · ${NEEDS_SOURCE_HINT}`
            : item.label;

        return (
          <div key={item.key} className="group relative">
            <button
              type="button"
              onClick={item.onClick}
              disabled={isDisabled}
              aria-label={hint}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-xl transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-muted",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover hover:text-foreground",
                !isDisabled && "cursor-pointer",
                isDisabled && !item.loading && "cursor-not-allowed opacity-50",
                item.loading && "cursor-progress",
              )}
            >
              {item.loading ? <Spinner className="h-4 w-4" /> : <item.icon className="h-5 w-5" />}
            </button>
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute left-full top-1/2 z-30 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-surface opacity-0 shadow-md transition-opacity",
                "group-hover:opacity-100 group-has-[:focus-visible]:opacity-100",
              )}
            >
              {hint}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

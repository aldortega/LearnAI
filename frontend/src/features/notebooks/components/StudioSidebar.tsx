import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  Headphones,
  Presentation,
  Layers,
  MessageSquare,
  Network,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";

type Mode =
  | "chat"
  | "quiz"
  | "quickstart"
  | "reports"
  | "presentations"
  | "mindmap"
  | "flashcards"
  | "audio";

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
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
  onGoReports: () => void;
  onGoPresentations: () => void;
  onGoMindmap: () => void;
  onGoFlashcards: () => void;
  onGoAudio?: () => void;
};

export function StudioSidebar({
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
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
  onGoReports,
  onGoPresentations,
  onGoMindmap,
  onGoFlashcards,
  onGoAudio,
}: Props) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("studioSidebarOpen");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("studioSidebarOpen", String(isOpen));
  }, [isOpen]);

  const activeMode: Mode | null = isStudioLocked ? null : mode;
  const items = [
    {
      key: "quickstart" as const,
      label: "Inicio rapido",
      icon: Sparkles,
      onClick: onGoQuickstart,
      disabled: isStudioLocked || !canStartQuickstart,
      loading: isGeneratingQuickstart,
    },
    {
      key: "mindmap" as const,
      label: "Mapa mental",
      icon: Network,
      onClick: onGoMindmap,
      disabled: isStudioLocked || !canStartMindmap,
      loading: isGeneratingMindmap,
    },
    {
      key: "chat" as const,
      label: "Chat",
      icon: MessageSquare,
      onClick: onGoChat,
      disabled: isStudioLocked,
      loading: false,
    },
    {
      key: "quiz" as const,
      label: "Quiz",
      icon: BookOpenCheck,
      onClick: onGoQuiz,
      disabled: isStudioLocked || !canStartQuiz,
      loading: isGeneratingQuiz,
    },
    {
      key: "flashcards" as const,
      label: "Flashcards",
      icon: Layers,
      onClick: onGoFlashcards,
      disabled: isStudioLocked || !canStartFlashcards,
      loading: isGeneratingFlashcards,
    },
    {
      key: "reports" as const,
      label: "Informes",
      icon: FileText,
      onClick: onGoReports,
      disabled: isStudioLocked || !canStartReports,
      loading: isGeneratingReports,
    },
    {
      key: "presentations" as const,
      label: "Presentaciones",
      icon: Presentation,
      onClick: onGoPresentations,
      disabled: isStudioLocked || !canStartPresentations,
      loading: isGeneratingPresentations,
    },
    {
      key: "audio" as const,
      label: "Audios",
      icon: Headphones,
      onClick: onGoAudio ?? (() => undefined),
      disabled: isStudioLocked || !canStartAudio || !onGoAudio,
      loading: isGeneratingAudio,
    },
  ];

  const hasAnyBlockedMode =
    !canStartQuickstart ||
    !canStartQuiz ||
    !canStartFlashcards ||
    !canStartReports ||
    !canStartPresentations ||
    !canStartMindmap;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden border-l border-border bg-muted transition-all duration-300 ease-in-out",
        "dark:border-border",
        isOpen ? "w-64" : "w-12",
      )}
    >
      <div
        className={cn(
          "flex h-[45px] items-center border-b border-border",
          "dark:border-border",
          isOpen ? "justify-between px-4" : "justify-center",
        )}
      >
        {isOpen ? (
          <h2 className="whitespace-nowrap text-sm font-semibold text-foreground">Estudio</h2>
        ) : null}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted-hover"
          aria-label={isOpen ? "Cerrar panel" : "Abrir panel"}
        >
          {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn("flex-1 overflow-y-auto p-4", !isOpen && "px-2")}>
        {isOpen ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <div className="grid gap-2">
                {items.map((item) => (
                  <Button
                    key={item.key}
                    variant={activeMode === item.key ? "primary" : "ghost"}
                    className="w-full justify-start whitespace-nowrap transition-colors"
                    leftIcon={<item.icon className="h-4 w-4" />}
                    onClick={item.onClick}
                    disabled={item.disabled}
                    loading={item.loading}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              {!isStudioLocked && hasAnyBlockedMode ? (
                <p className="mt-3 text-xs text-muted-foreground" role="alert">
                  Necesitas al menos una fuente lista para usar el modo estudio.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pt-4">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={cn(
                  "rounded-md p-2 transition-colors",
                  activeMode === item.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted-hover",
                  (item.disabled || item.loading) && "cursor-not-allowed opacity-50",
                )}
                onClick={item.onClick}
                disabled={item.disabled || item.loading}
                title={item.label}
                aria-label={item.label}
              >
                <item.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  MessageSquare,
  Network,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";

type Mode = "chat" | "quiz" | "quickstart" | "reports" | "mindmap" | "flashcards";

type Props = {
  mode: Mode;
  isStudioLocked: boolean;
  canStartQuiz: boolean;
  isGeneratingQuiz: boolean;
  canStartQuickstart: boolean;
  isGeneratingQuickstart: boolean;
  canStartReports: boolean;
  isGeneratingReports: boolean;
  canStartMindmap: boolean;
  isGeneratingMindmap: boolean;
  canStartFlashcards: boolean;
  isGeneratingFlashcards: boolean;
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
  onGoReports: () => void;
  onGoMindmap: () => void;
  onGoFlashcards: () => void;
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
  canStartMindmap,
  isGeneratingMindmap,
  canStartFlashcards,
  isGeneratingFlashcards,
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
  onGoReports,
  onGoMindmap,
  onGoFlashcards,
}: Props) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("studioSidebarOpen");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("studioSidebarOpen", String(isOpen));
  }, [isOpen]);

  const isQuickstartDisabled = isStudioLocked || !canStartQuickstart;
  const isMindmapDisabled = isStudioLocked || !canStartMindmap;
  const isChatDisabled = isStudioLocked;
  const isQuizDisabled = isStudioLocked || !canStartQuiz;
  const isFlashcardsDisabled = isStudioLocked || !canStartFlashcards;
  const isReportsDisabled = isStudioLocked || !canStartReports;
  const activeMode: Mode | null = isStudioLocked ? null : mode;

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
          <h2 className="text-sm font-semibold text-foreground whitespace-nowrap">
            Estudio
          </h2>
        ) : null}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted-hover"
          aria-label={isOpen ? "Cerrar panel" : "Abrir panel"}
        >
          {isOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className={cn("flex-1 overflow-y-auto p-4", !isOpen && "px-2")}>
        {isOpen ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              <div className="grid gap-2">
                <Button
                  variant={activeMode === "quickstart" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<Sparkles className="h-4 w-4" />}
                  onClick={onGoQuickstart}
                  disabled={isQuickstartDisabled}
                  loading={isGeneratingQuickstart}
                >
                  Inicio rapido
                </Button>

                <Button
                  variant={activeMode === "mindmap" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<Network className="h-4 w-4" />}
                  onClick={onGoMindmap}
                  disabled={isMindmapDisabled}
                  loading={isGeneratingMindmap}
                >
                  Mapa mental
                </Button>

                <Button
                  variant={activeMode === "chat" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<MessageSquare className="h-4 w-4" />}
                  onClick={onGoChat}
                  disabled={isChatDisabled}
                >
                  Chat
                </Button>

                <Button
                  variant={activeMode === "quiz" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<BookOpenCheck className="h-4 w-4" />}
                  onClick={onGoQuiz}
                  disabled={isQuizDisabled}
                  loading={isGeneratingQuiz}
                >
                  Quiz
                </Button>

                <Button
                  variant={activeMode === "flashcards" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<Layers className="h-4 w-4" />}
                  onClick={onGoFlashcards}
                  disabled={isFlashcardsDisabled}
                  loading={isGeneratingFlashcards}
                >
                  Flashcards
                </Button>

                <Button
                  variant={activeMode === "reports" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<FileText className="h-4 w-4" />}
                  onClick={onGoReports}
                  disabled={isReportsDisabled}
                  loading={isGeneratingReports}
                >
                  Informes
                </Button>
              </div>

              {!isStudioLocked &&
              (!canStartQuickstart ||
                !canStartQuiz ||
                !canStartFlashcards ||
                !canStartReports ||
                !canStartMindmap) ? (
                <p className="mt-3 text-xs text-muted-foreground" role="alert">
                  Necesitas al menos una fuente lista para usar el modo estudio.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pt-4">
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                activeMode === "quickstart"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                (isQuickstartDisabled || isGeneratingQuickstart) &&
                  "cursor-not-allowed opacity-50",
              )}
              onClick={onGoQuickstart}
              disabled={isQuickstartDisabled || isGeneratingQuickstart}
              title="Inicio rapido"
              aria-label="Inicio rapido"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                activeMode === "mindmap"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                (isMindmapDisabled || isGeneratingMindmap) &&
                  "cursor-not-allowed opacity-50",
              )}
              onClick={onGoMindmap}
              disabled={isMindmapDisabled || isGeneratingMindmap}
              title="Mapa mental"
              aria-label="Mapa mental"
            >
              <Network className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                activeMode === "chat"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                isChatDisabled && "cursor-not-allowed opacity-50",
              )}
              onClick={onGoChat}
              disabled={isChatDisabled}
              title="Chat"
              aria-label="Chat"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                activeMode === "quiz"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                (isQuizDisabled || isGeneratingQuiz) && "cursor-not-allowed opacity-50",
              )}
              onClick={onGoQuiz}
              disabled={isQuizDisabled || isGeneratingQuiz}
              title="Quiz"
              aria-label="Quiz"
            >
              <BookOpenCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                activeMode === "flashcards"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                (isFlashcardsDisabled || isGeneratingFlashcards) &&
                  "cursor-not-allowed opacity-50",
              )}
              onClick={onGoFlashcards}
              disabled={isFlashcardsDisabled || isGeneratingFlashcards}
              title="Flashcards"
              aria-label="Flashcards"
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                activeMode === "reports"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                (isReportsDisabled || isGeneratingReports) &&
                  "cursor-not-allowed opacity-50",
              )}
              onClick={onGoReports}
              disabled={isReportsDisabled || isGeneratingReports}
              title="Informes"
              aria-label="Informes"
            >
              <FileText className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

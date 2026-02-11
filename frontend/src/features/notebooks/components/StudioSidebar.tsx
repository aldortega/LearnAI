import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Network,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";

type Mode = "chat" | "quiz" | "quickstart" | "reports" | "mindmap";

type Props = {
  mode: Mode;
  canStartQuiz: boolean;
  isGeneratingQuiz: boolean;
  canStartQuickstart: boolean;
  isGeneratingQuickstart: boolean;
  canStartReports: boolean;
  isGeneratingReports: boolean;
  canStartMindmap: boolean;
  isGeneratingMindmap: boolean;
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
  onGoReports: () => void;
  onGoMindmap: () => void;
};

export function StudioSidebar({
  mode,
  canStartQuiz,
  isGeneratingQuiz,
  canStartQuickstart,
  isGeneratingQuickstart,
  canStartReports,
  isGeneratingReports,
  canStartMindmap,
  isGeneratingMindmap,
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
  onGoReports,
  onGoMindmap,
}: Props) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("studioSidebarOpen");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("studioSidebarOpen", String(isOpen));
  }, [isOpen]);

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
                  variant={mode === "quickstart" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<Sparkles className="h-4 w-4" />}
                  onClick={onGoQuickstart}
                  disabled={!canStartQuickstart}
                  loading={isGeneratingQuickstart}
                >
                  Inicio rapido
                </Button>

                <Button
                  variant={mode === "mindmap" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<Network className="h-4 w-4" />}
                  onClick={onGoMindmap}
                  disabled={!canStartMindmap}
                  loading={isGeneratingMindmap}
                >
                  Mapa mental
                </Button>

                <Button
                  variant={mode === "chat" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<MessageSquare className="h-4 w-4" />}
                  onClick={onGoChat}
                >
                  Chat
                </Button>

                <Button
                  variant={mode === "quiz" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<BookOpenCheck className="h-4 w-4" />}
                  onClick={onGoQuiz}
                  disabled={!canStartQuiz}
                  loading={isGeneratingQuiz}
                >
                  Quiz
                </Button>

                <Button
                  variant={mode === "reports" ? "primary" : "ghost"}
                  className="w-full justify-start whitespace-nowrap transition-colors"
                  leftIcon={<FileText className="h-4 w-4" />}
                  onClick={onGoReports}
                  disabled={!canStartReports}
                  loading={isGeneratingReports}
                >
                  Informes
                </Button>
              </div>

              {!canStartQuickstart ? (
                <p className="mt-3 text-xs text-muted-foreground" role="alert">
                  Necesitas al menos una fuente lista para generar el inicio rapido.
                </p>
              ) : null}

              {!canStartQuiz ? (
                <p className="mt-3 text-xs text-muted-foreground" role="alert">
                  Necesitas al menos una fuente lista para generar el quiz.
                </p>
              ) : null}

              {!canStartReports ? (
                <p className="mt-3 text-xs text-muted-foreground" role="alert">
                  Necesitas al menos una fuente lista para generar informes.
                </p>
              ) : null}

              {!canStartMindmap ? (
                <p className="mt-3 text-xs text-muted-foreground" role="alert">
                  Necesitas al menos una fuente lista para generar el mapa mental.
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
                mode === "quickstart"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                (!canStartQuickstart || isGeneratingQuickstart) &&
                  "cursor-not-allowed opacity-50",
              )}
              onClick={onGoQuickstart}
              disabled={!canStartQuickstart || isGeneratingQuickstart}
              title="Inicio rapido"
              aria-label="Inicio rapido"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                mode === "mindmap"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                (!canStartMindmap || isGeneratingMindmap) &&
                  "cursor-not-allowed opacity-50",
              )}
              onClick={onGoMindmap}
              disabled={!canStartMindmap || isGeneratingMindmap}
              title="Mapa mental"
              aria-label="Mapa mental"
            >
              <Network className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                mode === "chat"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
              )}
              onClick={onGoChat}
              title="Chat"
              aria-label="Chat"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                mode === "quiz"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                (!canStartQuiz || isGeneratingQuiz) && "cursor-not-allowed opacity-50",
              )}
              onClick={onGoQuiz}
              disabled={!canStartQuiz || isGeneratingQuiz}
              title="Quiz"
              aria-label="Quiz"
            >
              <BookOpenCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md p-2 transition-colors",
                mode === "reports"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted-hover",
                (!canStartReports || isGeneratingReports) &&
                  "cursor-not-allowed opacity-50",
              )}
              onClick={onGoReports}
              disabled={!canStartReports || isGeneratingReports}
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

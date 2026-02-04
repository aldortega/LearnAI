import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";

type Mode = "chat" | "quiz" | "quickstart";

type Props = {
  mode: Mode;
  canStartQuiz: boolean;
  isGeneratingQuiz: boolean;
  canStartQuickstart: boolean;
  isGeneratingQuickstart: boolean;
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
};

export function StudioSidebar({
  mode,
  canStartQuiz,
  isGeneratingQuiz,
  canStartQuickstart,
  isGeneratingQuickstart,
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
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
        "relative flex h-full flex-col overflow-hidden border-l border-zinc-200 bg-zinc-50 transition-all duration-300 ease-in-out",
        "dark:border-zinc-800 dark:bg-zinc-900",
        isOpen ? "w-72" : "w-12",
      )}
    >
      <div
        className={cn(
          "flex h-[45px] items-center border-b border-zinc-200",
          "dark:border-zinc-800",
          isOpen ? "justify-between px-4" : "justify-center",
        )}
      >
        {isOpen ? (
          <h2 className="text-sm font-semibold text-zinc-900 whitespace-nowrap dark:text-zinc-100">
            Estudio
          </h2>
        ) : null}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-label={isOpen ? "Cerrar panel" : "Abrir panel"}
        >
          {isOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className={cn("flex-1 p-4", !isOpen && "px-2")}>
        {isOpen ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Modo
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {mode === "quiz"
                      ? "Quiz activo"
                      : mode === "quickstart"
                        ? "Inicio rapido activo"
                        : "Chat activo"}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Button
                  variant={mode === "quickstart" ? "primary" : "ghost"}
                  className="w-full justify-start"
                  leftIcon={<Sparkles className="h-4 w-4" />}
                  onClick={onGoQuickstart}
                  disabled={!canStartQuickstart}
                  loading={isGeneratingQuickstart}
                >
                  Inicio rapido
                </Button>

                <Button
                  variant={mode === "chat" ? "primary" : "ghost"}
                  className="w-full justify-start"
                  leftIcon={<MessageSquare className="h-4 w-4" />}
                  onClick={onGoChat}
                >
                  Chat
                </Button>

                <Button
                  variant={mode === "quiz" ? "primary" : "ghost"}
                  className="w-full justify-start"
                  leftIcon={<BookOpenCheck className="h-4 w-4" />}
                  onClick={onGoQuiz}
                  disabled={!canStartQuiz}
                  loading={isGeneratingQuiz}
                >
                  Quiz
                </Button>
              </div>

              {!canStartQuickstart ? (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400" role="alert">
                  Necesitas al menos una fuente lista para generar el inicio rapido.
                </p>
              ) : null}

              {!canStartQuiz ? (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400" role="alert">
                  Necesitas al menos una fuente lista para generar el quiz.
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
                  ? "bg-emerald-900 text-white shadow-sm dark:bg-emerald-400 dark:text-emerald-950"
                  : "text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800",
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
                mode === "chat"
                  ? "bg-emerald-900 text-white shadow-sm dark:bg-emerald-400 dark:text-emerald-950"
                  : "text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800",
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
                  ? "bg-emerald-900 text-white shadow-sm dark:bg-emerald-400 dark:text-emerald-950"
                  : "text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800",
                (!canStartQuiz || isGeneratingQuiz) && "cursor-not-allowed opacity-50",
              )}
              onClick={onGoQuiz}
              disabled={!canStartQuiz || isGeneratingQuiz}
              title="Quiz"
              aria-label="Quiz"
            >
              <BookOpenCheck className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

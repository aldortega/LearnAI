import { BookOpenCheck, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";

type Mode = "chat" | "quiz";

type Props = {
  mode: Mode;
  canStartQuiz: boolean;
  isGeneratingQuiz: boolean;
  onGoChat: () => void;
  onGoQuiz: () => void;
};

export function StudioSidebar({
  mode,
  canStartQuiz,
  isGeneratingQuiz,
  onGoChat,
  onGoQuiz,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);

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
                    {mode === "quiz" ? "Quiz activo" : "Chat activo"}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
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
                "rounded-md p-2 text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800",
                mode === "chat" && "bg-white shadow-sm dark:bg-zinc-950",
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
                "rounded-md p-2 text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800",
                mode === "quiz" && "bg-white shadow-sm dark:bg-zinc-950",
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

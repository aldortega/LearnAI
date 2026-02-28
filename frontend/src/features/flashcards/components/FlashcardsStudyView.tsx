import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { FlashcardExplainModal } from "./FlashcardExplainModal";
import { useFlashcardExplanation } from "../hooks/useFlashcardExplanation";
import type { FlashcardSetOut } from "../types/flashcards.types";

type Props = {
  notebookId: string;
  flashcardSet: FlashcardSetOut;
  initialCardIndex?: number;
  error: string | null;
  onGoToPreviousSet: () => void;
  hasPreviousSet: boolean;
  onGoToNextSet: () => void;
  hasNextSet: boolean;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.closest("[contenteditable='true']") !== null
  );
}

export function FlashcardsStudyView({
  notebookId,
  flashcardSet,
  initialCardIndex = 0,
  error,
  onGoToPreviousSet,
  hasPreviousSet,
  onGoToNextSet,
  hasNextSet,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialCardIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [navigationDirection, setNavigationDirection] = useState<"prev" | "next">(
    "next",
  );
  const {
    isOpen: isExplainModalOpen,
    isLoading: isExplainLoading,
    error: explainError,
    activeTerm,
    explanationMarkdown,
    openExplanation,
    closeExplanation,
  } = useFlashcardExplanation(notebookId);

  const cards = flashcardSet.cards;
  const currentCard = cards[currentIndex] ?? null;
  const isFirstCard = currentIndex === 0;
  const isLastCard = currentIndex === cards.length - 1;
  const cardChangeAnimationClass =
    navigationDirection === "next"
      ? "[animation:flashcard-enter-next_380ms_cubic-bezier(0.22,1,0.36,1)]"
      : "[animation:flashcard-enter-prev_380ms_cubic-bezier(0.22,1,0.36,1)]";

  const goToPreviousCard = useCallback(() => {
    setNavigationDirection("prev");
    setCurrentIndex((previous) => {
      if (previous <= 0) {
        if (hasPreviousSet) {
          onGoToPreviousSet();
        }
        return previous;
      }
      return previous - 1;
    });
    setIsFlipped(false);
  }, [hasPreviousSet, onGoToPreviousSet]);

  const goToNextCard = useCallback(() => {
    setNavigationDirection("next");
    setCurrentIndex((previous) => {
      if (previous >= cards.length - 1) {
        if (hasNextSet) {
          onGoToNextSet();
        }
        return previous;
      }
      return previous + 1;
    });
    setIsFlipped(false);
  }, [cards.length, hasNextSet, onGoToNextSet]);

  const toggleCardFace = useCallback(() => {
    setIsFlipped((previous) => !previous);
  }, []);

  useEffect(() => {
    closeExplanation();
  }, [currentCard?.id, closeExplanation]);

  useEffect(() => {
    if (!isFlipped) {
      closeExplanation();
    }
  }, [isFlipped, closeExplanation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousCard();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextCard();
        return;
      }

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        if (!event.repeat) {
          toggleCardFace();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToNextCard, goToPreviousCard, toggleCardFace]);

  if (!currentCard) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-muted-foreground" role="alert">
          No hay flashcards para mostrar.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <p className="text-center text-sm font-semibold text-foreground">
          {flashcardSet.set_title}
        </p>

        {flashcardSet.status === "stale" ? (
          <p className="rounded-xl border border-border bg-muted px-4 py-2 text-xs text-muted-foreground" role="alert">
            Tus flashcards estan desactualizadas porque cambiaron las fuentes. Regeneralas para actualizar su contenido.
          </p>
        ) : null}

        {error ? (
          <div
            className="rounded-xl border border-error bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-sm transition hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isFirstCard && !hasPreviousSet}
            aria-label="Tarjeta anterior"
            title="Tarjeta anterior"
            onClick={goToPreviousCard}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="relative w-full">
            <button
              type="button"
              onClick={toggleCardFace}
              className="aspect-[3/2] w-full text-left [perspective:1200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:aspect-[4/3]"
              aria-label={isFlipped ? "Mostrar frente" : "Mostrar reverso"}
            >
              <div
                key={currentIndex}
                className={`h-full w-full motion-reduce:animate-none ${cardChangeAnimationClass}`}
              >
                <div
                  className={`relative h-full w-full [transform-style:preserve-3d] transition-transform duration-500 ease-out motion-reduce:transition-none ${
                    isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
                  }`}
                >
                  <div className="absolute inset-0 flex items-center justify-center overflow-y-auto rounded-xl border border-border bg-muted px-4 py-4 shadow-sm transition [backface-visibility:hidden] hover:border-border-strong hover:shadow-md">
                    <p className="w-full text-center text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                      {currentCard.term}
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center overflow-y-auto rounded-xl border border-border bg-muted px-4 py-4 pb-14 shadow-sm transition [backface-visibility:hidden] [transform:rotateY(180deg)] hover:border-border-strong hover:shadow-md">
                    <p className="w-full text-center text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                      {currentCard.definition}
                    </p>
                    <div className="absolute bottom-3 right-3 z-10">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!currentCard) return;
                          void openExplanation(flashcardSet.set_id, currentCard);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/95 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                        disabled={isExplainLoading}
                        aria-label="Explicar tarjeta"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {isExplainLoading ? "Explicando..." : "Explicar"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-sm transition hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLastCard && !hasNextSet}
            aria-label="Tarjeta siguiente"
            title="Tarjeta siguiente"
            onClick={goToNextCard}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

      </div>

      <FlashcardExplainModal
        isOpen={isExplainModalOpen}
        isLoading={isExplainLoading}
        error={explainError}
        term={activeTerm}
        explanationMarkdown={explanationMarkdown}
        onClose={closeExplanation}
      />
    </div>
  );
}

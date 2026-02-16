import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import type { FlashcardsOut } from "../types/flashcards.types";

type Props = {
  flashcards: FlashcardsOut;
  error: string | null;
};

export function FlashcardsStudyView({
  flashcards,
  error,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const cards = flashcards.cards;
  const currentCard = cards[currentIndex] ?? null;
  const isFirstCard = currentIndex === 0;
  const isLastCard = currentIndex === cards.length - 1;

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
        {flashcards.status === "stale" ? (
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
            disabled={isFirstCard}
            aria-label="Tarjeta anterior"
            title="Tarjeta anterior"
            onClick={() => {
              setCurrentIndex((previous) => Math.max(0, previous - 1));
              setIsFlipped(false);
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsFlipped((previous) => !previous)}
            className="aspect-[3/2] w-full rounded-xl border border-border bg-muted px-4 py-4 text-left shadow-sm transition hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:aspect-[4/3]"
            aria-label={isFlipped ? "Mostrar termino" : "Mostrar definicion"}
          >
            <div className="flex h-full items-center justify-center">
              <p
                className={`text-base font-semibold text-foreground sm:text-lg ${
                  isFlipped ? "" : "text-center"
                }`}
              >
                {isFlipped ? currentCard.definition : currentCard.term}
              </p>
            </div>
          </button>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-sm transition hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLastCard}
            aria-label="Tarjeta siguiente"
            title="Tarjeta siguiente"
            onClick={() => {
              setCurrentIndex((previous) => Math.min(cards.length - 1, previous + 1));
              setIsFlipped(false);
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

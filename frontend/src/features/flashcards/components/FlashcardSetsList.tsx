import { Trash2 } from "lucide-react";

import type { FlashcardSetOut } from "../types/flashcards.types";

type Props = {
  sets: FlashcardSetOut[];
  onSelectSet: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
};

export function FlashcardSetsList({ sets, onSelectSet, onDeleteSet }: Props) {
  if (!sets.length) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-muted-foreground" role="alert">
          No hay sets de flashcards para mostrar.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Selecciona un set</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((setItem) => (
            <div key={setItem.set_id} className="group relative">
              <button
                type="button"
                onClick={() => onSelectSet(setItem.set_id)}
                className="w-full text-left [perspective:1200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="relative aspect-[4/3] w-full">
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl border border-border bg-muted px-4 py-4 shadow-sm transition hover:border-border-strong hover:shadow-md">
                    <p className="line-clamp-3 text-center text-base font-semibold leading-relaxed text-foreground">
                      {setItem.set_title}
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onDeleteSet(setItem.set_id)}
                aria-label={`Eliminar set ${setItem.set_title}`}
                title="Eliminar set"
                className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-background/80 text-muted-foreground opacity-100 shadow-sm transition hover:bg-background hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

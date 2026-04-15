import type { FlashcardSetOut } from "../types/flashcards.types";

type Props = {
  sets: FlashcardSetOut[];
  onSelectSet: (setId: string) => void;
};

export function FlashcardSetsList({ sets, onSelectSet }: Props) {
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
            <button
              key={setItem.set_id}
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
          ))}
        </div>
      </div>
    </div>
  );
}

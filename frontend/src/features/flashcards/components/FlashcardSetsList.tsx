import type { FlashcardSetOut } from "../types/flashcards.types";

type Props = {
  sets: FlashcardSetOut[];
  onSelectSet: (setId: string) => void;
};

function formatGeneratedAt(value?: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Selecciona un set</h3>
        <div className="grid gap-3">
          {sets.map((setItem) => (
            <button
              key={setItem.set_id}
              type="button"
              onClick={() => onSelectSet(setItem.set_id)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left transition hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <p className="text-sm font-semibold text-foreground">{setItem.set_title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {setItem.cards.length} tarjetas · dificultad {setItem.difficulty} ·{" "}
                {formatGeneratedAt(setItem.generated_at)}
              </p>
              {setItem.status === "stale" ? (
                <p className="mt-2 text-xs text-warning" role="alert">
                  Este set esta desactualizado por cambios en fuentes.
                </p>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

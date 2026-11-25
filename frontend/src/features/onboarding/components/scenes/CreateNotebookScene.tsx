import { BookOpen } from "lucide-react";

import { DEMO_NOTEBOOK } from "../../utils/demoContent";

type Props = {
  typedName: string;
  isCreated: boolean;
};

export function CreateNotebookScene({ typedName, isCreated }: Props) {
  return (
    <div className="mx-auto w-full max-w-xs rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Nuevo cuaderno</p>
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors duration-300 ${
          isCreated ? "border-primary bg-muted" : "border-primary ring-2 ring-primary/20"
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center">
          {isCreated ? (
            <span className="animate-pop-in text-lg motion-reduce:animate-none" aria-hidden="true">
              {DEMO_NOTEBOOK.emoji}
            </span>
          ) : (
            <span className="h-5 w-5 rounded-full border-2 border-dashed border-border-strong" aria-hidden="true" />
          )}
        </span>
        <span className="flex min-h-5 items-center text-sm font-semibold text-foreground">
          {typedName ? typedName : <span className="font-normal text-muted-foreground">Nombre del cuaderno</span>}
          {isCreated ? null : (
            <span
              className="ml-px inline-block h-4 w-0.5 animate-caret-blink bg-primary motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
        </span>
      </div>
      {isCreated ? (
        <p className="mt-3 flex animate-fade-up items-center gap-2 text-xs font-medium text-primary">
          <BookOpen className="h-4 w-4" /> Cuaderno creado
        </p>
      ) : null}
    </div>
  );
}

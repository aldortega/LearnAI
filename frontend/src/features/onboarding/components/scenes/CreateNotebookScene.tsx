import { BookOpen } from "lucide-react";

import { DEMO_NOTEBOOK } from "../../utils/demoContent";

type Props = {
  isCreated: boolean;
};

export function CreateNotebookScene({ isCreated }: Props) {
  return (
    <div className="mx-auto w-full max-w-xs rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Nuevo cuaderno</p>
      <div className="flex items-center gap-2 rounded-lg border border-primary px-3 py-2">
        <span className="text-lg">{DEMO_NOTEBOOK.emoji}</span>
        <span className="text-sm font-semibold text-foreground">
          {isCreated ? DEMO_NOTEBOOK.name : <span className="animate-pulse">|</span>}
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

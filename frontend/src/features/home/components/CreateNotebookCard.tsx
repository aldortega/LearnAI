import { Plus } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export function CreateNotebookCard(props: Props) {
  return (
    <button
      {...props}
      className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-5 text-muted-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary cursor-pointer dark:hover:border-primary"
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted group-hover:bg-surface">
        <Plus className="h-6 w-6" />
      </div>
      <span className="font-medium">Nuevo Notebook</span>
    </button>
  );
}


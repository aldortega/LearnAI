import { Plus } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export function CreateNotebookCard(props: Props) {
  return (
    <button
      {...props}
      className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-200 p-5 text-zinc-500 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 group-hover:bg-white dark:bg-zinc-900 dark:group-hover:bg-zinc-800">
        <Plus className="h-6 w-6" />
      </div>
      <span className="font-medium">Nuevo Notebook</span>
    </button>
  );
}

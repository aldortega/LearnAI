import { Plus } from "lucide-react";

export function CreateNotebookCard() {
  return (
    <button className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-200 p-5 text-zinc-500 transition-all hover:border-[color:var(--color-fern-400)] hover:bg-[color:var(--color-fern-50)] hover:text-[color:var(--color-fern-700)]">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 group-hover:bg-white">
        <Plus className="h-6 w-6" />
      </div>
      <span className="font-medium">Nuevo Notebook</span>
    </button>
  );
}

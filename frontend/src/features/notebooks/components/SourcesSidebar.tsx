import { ChevronLeft, ChevronRight, FileText, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";

type Props = {
  children?: React.ReactNode;
};

export function SourcesSidebar({ children }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r border-zinc-200 bg-zinc-50 transition-all duration-300 ease-in-out",
        isOpen ? "w-80" : "w-12",
      )}
    >
      <div
        className={cn(
          "flex h-[45px] items-center border-b border-zinc-200",
          isOpen ? "justify-between px-4" : "justify-center",
        )}
      >
        {isOpen && (
          <h2 className="text-sm font-semibold text-zinc-900">Fuentes</h2>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-200"
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className={cn("flex-1 overflow-y-auto p-4", !isOpen && "px-2")}>
        {isOpen ? (
          <>
            <Button
              className="mb-6 w-full"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Añadir fuentes
            </Button>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center text-center mt-10">
              <div className="mb-3 rounded-2xl bg-zinc-100 p-3">
                <FileText className="h-6 w-6 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500">
                Las fuentes guardadas aparecerán aquí.
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Haz clic en el botón Añadir fuente de arriba para añadir PDFs,
                sitios web, texto, vídeos o archivos de audio.
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              className="rounded p-2 hover:bg-zinc-200 text-zinc-500"
              title="Añadir fuente"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

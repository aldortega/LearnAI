import { ChevronLeft, ChevronRight, Settings, Sparkles } from "lucide-react";
import { useState } from "react";

import { cn } from "../../../shared/lib/cn";

export function StudioSidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-l border-zinc-200 bg-zinc-50 transition-all duration-300 ease-in-out",
        isOpen ? "w-72" : "w-12",
      )}
    >
      <div
        className={cn(
          "flex h-[45px] items-center border-b border-zinc-200",
          isOpen ? "justify-between px-4" : "justify-center",
        )}
      >
        {isOpen && (
          <h2 className="text-sm font-semibold text-zinc-900">Estudio</h2>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-200"
        >
          {isOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className={cn("flex-1 p-4", !isOpen && "px-2")}>
        {isOpen ? (
          <div className="space-y-4">
             {/* Fake buttons/cards */}
             <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-emerald-600">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">Resumen</span>
                </div>
                <p className="text-xs text-zinc-500">Genera un resumen automático de tus fuentes seleccionadas.</p>
             </div>

             <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-zinc-600">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Configuración</span>
                </div>
                <p className="text-xs text-zinc-500">Ajusta los parámetros del modelo.</p>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 pt-4">
              <button className="rounded p-2 hover:bg-zinc-200 text-zinc-500">
                <Sparkles className="h-4 w-4" />
              </button>
          </div>
        )}
      </div>
    </div>
  );
}

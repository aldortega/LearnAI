import { Upload } from "lucide-react";

import { Button } from "../../../shared/ui/Button";

export function ChatArea() {
  const hasSources = false; // Mock state for now

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex h-[45px] items-center border-b border-zinc-200 px-4">
        <h2 className="text-sm font-semibold text-zinc-900">Chat</h2>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        {!hasSources ? (
          <div className="max-w-md">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Upload className="h-8 w-8" />
            </div>
            <h2 className="mb-5 text-xl font-semibold text-zinc-900">
              Añade una fuente para comenzar
            </h2>
            {/* <p className="mb-8 text-zinc-500">
              Añade al menos una fuente (PDF, texto) para empezar a hacer
              preguntas sobre tu material de estudio.
            </p> */}
            <Button className="gap-2">Subir una fuente</Button>
          </div>
        ) : (
          <div>Chat interface will go here</div>
        )}
      </div>

      {/* Input Area (Mock) */}
      <div className="border-t border-zinc-100 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20">
            <input
              type="text"
              placeholder="Haz una pregunta sobre tus fuentes..."
              className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-400"
              disabled={!hasSources}
            />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-400">
            La IA puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}

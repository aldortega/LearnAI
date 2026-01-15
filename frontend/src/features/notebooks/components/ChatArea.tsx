import { Upload } from "lucide-react";
import { useState, type DragEvent } from "react";


type Props = {
  hasSources: boolean;
  onDropFile: (file: File) => void;
};

export function ChatArea({ hasSources, onDropFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      onDropFile(file);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-[45px] items-center border-b border-zinc-200 px-4">
        <h2 className="text-sm font-semibold text-zinc-900">Chat</h2>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        {!hasSources ? (
          <div className="max-w-md">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Upload className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-900">
              Comienza a chatear
            </h2>
            <p className="mb-6 text-zinc-500">
              Añade al menos una fuente (PDF, texto) para empezar a hacer
              preguntas sobre tu material de estudio.
            </p>
            <div
              className={
                "flex items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-sm text-zinc-500 transition-all " +
                (isDragging
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-white")
              }
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              Arrastra y suelta un archivo aquí
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Formatos soportados: PDF, DOCX o TXT.
            </p>
          </div>
        ) : (
          <div>Chat interface will go here</div>
        )}
      </div>

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

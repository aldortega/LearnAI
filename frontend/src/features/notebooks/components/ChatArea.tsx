import { Upload } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import type { ChatMessage } from "../types/chat.types";
import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/lib/cn";


type Props = {
  hasSources: boolean;
  messages: ChatMessage[];
  streamingContent: string;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  onSendMessage: (content: string) => Promise<void>;
  onDropFile: (file: File) => void;
};

export function ChatArea({
  hasSources,
  messages,
  streamingContent,
  isLoading,
  isStreaming,
  error,
  onSendMessage,
  onDropFile,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingContent]);

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

  const isSendDisabled =
    !hasSources || isStreaming || isLoading || !draft.trim();

  const handleSubmit = async () => {
    if (isSendDisabled) return;
    const message = draft.trim();
    setDraft("");
    await onSendMessage(message);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void handleSubmit();
  };

  const shouldShowEmptyState =
    !isLoading && hasSources && messages.length === 0 && !streamingContent;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-[45px] items-center border-b border-zinc-200 px-4">
        <h2 className="text-sm font-semibold text-zinc-900">Chat</h2>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto" ref={scrollRef}>
        {!hasSources ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
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
          </div>
        ) : (
          <div className="flex flex-1 flex-col px-6 py-6">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
              {isLoading ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                  Cargando conversación…
                </div>
              ) : null}

              {shouldShowEmptyState ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                  Haz tu primera pregunta sobre las fuentes cargadas.
                </div>
              ) : null}

              {messages.map((message) => {
                const isAssistant = message.role === "assistant";

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col",
                      isAssistant ? "items-start" : "items-end",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        isAssistant
                          ? "bg-zinc-100 text-zinc-900"
                          : "bg-emerald-600 text-white",
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>

                    {isAssistant && message.sources.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                        {message.sources.map((source, index) => (
                          <span
                            key={`${message.id}-${index}`}
                            className="rounded-full border border-zinc-200 bg-white px-2 py-1"
                          >
                            {source.file_name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {streamingContent ? (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-900 shadow-sm">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {streamingContent}
                    </p>
                  </div>
                </div>
              ) : null}

              {isStreaming && !streamingContent ? (
                <div className="flex flex-col items-start">
                  <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500 shadow-sm">
                    Generando respuesta…
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100 p-4">
        <div className="mx-auto max-w-3xl space-y-2">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
            >
              {error}
            </div>
          ) : null}
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Haz una pregunta sobre tus fuentes..."
              className={cn(
                "min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900",
                "placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
              disabled={!hasSources || isStreaming || isLoading}
              rows={2}
            />
            <Button
              onClick={() => void handleSubmit()}
              disabled={isSendDisabled}
              className="h-11 px-4"
            >
              Enviar
            </Button>
          </div>
          <p className="text-center text-xs text-zinc-400">
            La IA puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}

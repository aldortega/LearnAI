import { MoreHorizontal, Upload } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { Streamdown } from "streamdown";

import type { ChatMessage } from "../types/chat.types";
import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/lib/cn";
import { ClearChatModal } from "./ClearChatModal";

type Props = {
  hasSources: boolean;
  messages: ChatMessage[];
  streamingContent: string;
  isLoading: boolean;
  isStreaming: boolean;
  isClearing: boolean;
  error: string | null;
  onSendMessage: (content: string) => Promise<void>;
  onClearChat: () => Promise<void>;
  onDropFile: (file: File) => void;
};

export function ChatArea({
  hasSources,
  messages,
  streamingContent,
  isLoading,
  isStreaming,
  isClearing,
  error,
  onSendMessage,
  onClearChat,
  onDropFile,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [draft, setDraft] = useState("");
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingContent]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleClearChat = async () => {
    await onClearChat();
    setIsClearModalOpen(false);
  };

  const shouldShowEmptyState =
    !isLoading && hasSources && messages.length === 0 && !streamingContent;

  const canClearChat = messages.length > 0 || Boolean(streamingContent);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      <div className="flex h-[45px] items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chat</h2>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Opciones del chat"
            title="Opciones del chat"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {isMenuOpen ? (
            <div className="absolute right-0 mt-2 w-44 origin-top-right rounded-lg border border-zinc-100 bg-white py-1 shadow-lg ring-1 ring-black/5 z-50 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center px-4 py-2 text-sm",
                  canClearChat && !isLoading && !isStreaming && !isClearing
                    ? "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    : "cursor-not-allowed text-zinc-300 dark:text-zinc-600",
                )}
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsClearModalOpen(true);
                }}
                disabled={!canClearChat || isLoading || isStreaming || isClearing}
              >
                Limpiar chat
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto" ref={scrollRef}>
        {!hasSources ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300">
                <Upload className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Comienza a chatear
              </h2>
              <p className="mb-6 text-zinc-500 dark:text-zinc-400">
                Añade al menos una fuente (PDF, texto) para empezar a hacer
                preguntas sobre tu material de estudio.
              </p>
              <div
                className={
                  "flex items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-sm text-zinc-500 transition-all " +
                  (isDragging
                    ? "border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-500/10 dark:text-green-300"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400")
                }
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                Arrastra y suelta un archivo aquí
              </div>
              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                Formatos soportados: PDF, DOCX o TXT.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col px-6 py-6">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
              {isLoading ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  Cargando conversación…
                </div>
              ) : null}

              {shouldShowEmptyState ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
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
                          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                          : "bg-green-900 text-white dark:bg-green-500",
                      )}
                    >
                      {isAssistant ? (
                        <div className="text-sm leading-relaxed">
                          <Streamdown>{message.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {/* Sources removed */}
                  </div>
                );
              })}

              {streamingContent ? (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
                    <div className="text-sm leading-relaxed">
                      <Streamdown>{streamingContent}</Streamdown>
                    </div>
                  </div>
                </div>
              ) : null}

              {isStreaming && !streamingContent ? (
                <div className="flex flex-col items-start">
                  <div className="rounded-2xl bg-zinc-100 px-4 py-4 shadow-sm dark:bg-zinc-900">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-600 [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-600 [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
        <ClearChatModal
          isOpen={isClearModalOpen}
          isClearing={isClearing}
          onCancel={() => setIsClearModalOpen(false)}
          onConfirm={() => void handleClearChat()}
        />
        <div className="mx-auto max-w-3xl space-y-2">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          <div className="flex items-stretch gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Haz una pregunta sobre tus fuentes..."
              className={cn(
                "min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900",
                "placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
              )}
              disabled={!hasSources || isStreaming || isLoading}
              rows={2}
            />
            <Button
              onClick={() => void handleSubmit()}
              disabled={isSendDisabled}
              className="px-6"
            >
              Enviar
            </Button>
          </div>
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
            La IA puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}

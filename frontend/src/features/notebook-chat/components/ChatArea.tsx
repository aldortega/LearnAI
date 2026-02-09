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
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">Chat</h2>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Opciones del chat"
            title="Opciones del chat"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {isMenuOpen ? (
            <div className="absolute right-0 mt-2 w-44 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-black/5 z-50">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center px-4 py-2 text-sm",
                  canClearChat && !isLoading && !isStreaming && !isClearing
                    ? "text-muted-foreground hover:bg-muted"
                    : "cursor-not-allowed text-muted-foreground",
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
              <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">
                Comienza a chatear
              </h2>
              <p className="mb-6 text-muted-foreground">
                Añade al menos una fuente (PDF, DOCX, TXT o PPTX) para empezar a hacer
                preguntas sobre tu material de estudio.
              </p>
              <div
                className={
                  "flex items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-sm text-muted-foreground transition-all " +
                  (isDragging
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface")
                }
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                Arrastra y suelta un archivo aquí
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Formatos soportados: PDF, DOCX, TXT o PPTX.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col px-6 py-6">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
              {isLoading ? (
                <div className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                  Cargando conversación…
                </div>
              ) : null}

              {shouldShowEmptyState ? (
                <div className="rounded-xl border border-dashed border-border bg-muted p-6 text-center text-sm text-muted-foreground">
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
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground",
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
                  <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm text-foreground shadow-sm">
                    <div className="text-sm leading-relaxed">
                      <Streamdown>{streamingContent}</Streamdown>
                    </div>
                  </div>
                </div>
              ) : null}

              {isStreaming && !streamingContent ? (
                <div className="flex flex-col items-start">
                  <div className="rounded-2xl bg-muted px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
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
              className="rounded-lg border border-error bg-error/10 px-3 py-2 text-xs text-error"
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
                "min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "dark:border-border",
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
          <p className="text-center text-xs text-muted-foreground">
            La IA puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}




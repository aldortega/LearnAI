import { Streamdown } from "streamdown";

import { Spinner } from "../../../shared/ui/Spinner";
import { cn } from "../../../shared/lib/cn";
import type { QuickstartTopicDetailOut } from "../types/quickstart.types";
import { normalizeMarkdown } from "../utils/markdown";

type SelectedDetail = {
  itemType: "additional_key_point" | "question";
  itemText: string;
} | null;

type Props = {
  questions: string[];
  selectedDetail: SelectedDetail;
  detail: QuickstartTopicDetailOut | null;
  isDetailLoading: boolean;
  isDetailReady: boolean;
  detailError: string | null;
  onSelect: (text: string) => void;
};

const answerProseClass =
  "text-sm leading-7 text-foreground/85 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1";

const inlineMarkdownClass =
  "text-[15px] leading-snug [&_p]:m-0 [&_strong]:font-semibold [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5";

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function QuickstartQuestionsExplorer({
  questions,
  selectedDetail,
  detail,
  isDetailLoading,
  isDetailReady,
  detailError,
  onSelect,
}: Props) {
  if (questions.length === 0) {
    return (
      <p className="text-sm text-foreground/75">
        No hay preguntas sugeridas para este tema.
      </p>
    );
  }

  const selectedIndex = questions.findIndex(
    (q) =>
      selectedDetail?.itemType === "question" &&
      normalize(selectedDetail.itemText) === normalize(q),
  );
  const selectedQuestion = selectedIndex >= 0 ? questions[selectedIndex] : null;

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col border-t border-border">
        {questions.map((q, i) => {
          const active = i === selectedIndex;
          return (
            <li key={`question-${i}`} className="border-b border-border">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(q)}
                className={cn(
                  "group flex w-full cursor-pointer items-start gap-4 py-3.5 text-left transition",
                  active ? "text-foreground" : "hover:bg-muted/40",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 shrink-0 font-mono text-xs tabular-nums tracking-tight transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground/70 group-hover:text-foreground/70",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1",
                    active ? "font-semibold text-foreground" : "text-foreground/85",
                    inlineMarkdownClass,
                  )}
                >
                  <Streamdown>{normalizeMarkdown(q)}</Streamdown>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {selectedQuestion ? (
        <article className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-5">
          <header className="flex items-start gap-3 border-b border-primary/15 pb-4">
            <span
              aria-hidden
              className="mt-1 shrink-0 font-mono text-xs tabular-nums text-primary"
            >
              {String(selectedIndex + 1).padStart(2, "0")}
            </span>
            <p
              className={cn(
                "min-w-0 flex-1 font-semibold text-foreground",
                inlineMarkdownClass,
              )}
            >
              <Streamdown>{normalizeMarkdown(selectedQuestion)}</Streamdown>
            </p>
          </header>
          <div className="pt-4">
            {isDetailLoading || (!isDetailReady && !detailError) ? (
              <div className="flex items-center gap-2 text-sm text-foreground/75">
                <Spinner className="h-4 w-4 border-green-500/30 border-t-green-600" />
                <span>Generando respuesta...</span>
              </div>
            ) : null}
            {detailError ? (
              <p className="text-sm text-error" role="alert">
                {detailError}
              </p>
            ) : null}
            {!isDetailLoading && !detailError && detail && isDetailReady ? (
              <div className={answerProseClass}>
                <Streamdown>{normalizeMarkdown(detail.content)}</Streamdown>
              </div>
            ) : null}
          </div>
        </article>
      ) : (
        <p className="text-xs text-muted-foreground">
          Selecciona una pregunta para ver una explicacion basada en tus fuentes.
        </p>
      )}
    </div>
  );
}

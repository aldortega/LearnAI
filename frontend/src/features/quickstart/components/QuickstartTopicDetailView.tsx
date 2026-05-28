import { ChevronDown } from "lucide-react";
import { Streamdown } from "streamdown";

import { Spinner } from "../../../shared/ui/Spinner";
import type {
  QuickstartDetailItemType,
  QuickstartExpansionOut,
  QuickstartTopic,
  QuickstartTopicDetailOut,
} from "../types/quickstart.types";
import { normalizeMarkdown } from "../utils/markdown";
import { resolveTopicEmoji } from "../utils/topicEmoji";
import { QuickstartQuestionsExplorer } from "./QuickstartQuestionsExplorer";

type SelectedDetail = {
  itemType: QuickstartDetailItemType;
  itemText: string;
} | null;

type Props = {
  topic: QuickstartTopic;
  isStale: boolean;
  expansion: QuickstartExpansionOut | null;
  isExpansionLoading: boolean;
  expansionError: string | null;
  detail: QuickstartTopicDetailOut | null;
  selectedDetail: SelectedDetail;
  isDetailLoading: boolean;
  isDetailReady: boolean;
  detailError: string | null;
  onSelectDetail: (itemType: QuickstartDetailItemType, itemText: string) => void;
};

function normalizeItemText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

const markdownBlockClass =
  "text-sm leading-7 text-foreground/85 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1";
const markdownInlineClass =
  "text-[15px] leading-snug [&_p]:m-0 [&_strong]:font-semibold [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5";

export function QuickstartTopicDetailView({
  topic,
  isStale,
  expansion,
  isExpansionLoading,
  expansionError,
  detail,
  selectedDetail,
  isDetailLoading,
  isDetailReady,
  detailError,
  onSelectDetail,
}: Props) {
  const additionalPoints = expansion?.key_points ?? [];
  const suggestedQuestions = expansion?.example_questions ?? [];
  const shouldShowExpansionSkeleton =
    !isStale && !expansion && !expansionError;

  const isPointSelected = (itemText: string) => {
    if (!selectedDetail || selectedDetail.itemType !== "additional_key_point") {
      return false;
    }
    return (
      normalizeItemText(selectedDetail.itemText).toLowerCase() ===
      normalizeItemText(itemText).toLowerCase()
    );
  };

  const topicEmoji = resolveTopicEmoji(topic.emoji);

  const renderPointsList = () => {
    if (additionalPoints.length === 0) {
      return (
        <p className="text-sm text-foreground/75">
          No hay puntos adicionales para este tema.
        </p>
      );
    }
    return (
      <ol className="flex flex-col border-t border-border">
        {additionalPoints.map((point, index) => {
          const active = isPointSelected(point);
          const numeral = String(index + 1).padStart(2, "0");
          const panelId = `${topic.id}-additional-point-${index}-panel`;
          return (
            <li
              key={`${topic.id}-additional-point-${index}`}
              className="border-b border-border"
            >
              <button
                type="button"
                aria-expanded={active}
                aria-controls={panelId}
                onClick={() => onSelectDetail("additional_key_point", point)}
                className={`group flex w-full cursor-pointer items-start gap-4 py-4 text-left transition ${active ? "" : "hover:bg-muted/40"}`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 shrink-0 font-mono text-xs tabular-nums tracking-tight transition-colors ${active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground/70"}`}
                >
                  {numeral}
                </span>
                <span
                  className={`min-w-0 flex-1 ${active ? "font-semibold text-foreground" : "text-foreground/90"} ${markdownInlineClass}`}
                >
                  <Streamdown>{normalizeMarkdown(point)}</Streamdown>
                </span>
                <ChevronDown
                  className={`mt-1 h-4 w-4 shrink-0 transition-transform duration-200 ${active ? "rotate-180 text-primary" : "text-muted-foreground"}`}
                  aria-hidden
                />
              </button>
              <div
                id={panelId}
                role="region"
                aria-hidden={!active}
                className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${active ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <div className="overflow-hidden">
                  <div className="pb-5 pl-10 pr-2 text-sm">
                    {active ? (
                      <>
                        {isDetailLoading || (!isDetailReady && !detailError) ? (
                          <div className="flex items-center gap-2 text-foreground/75">
                            <Spinner className="h-4 w-4 border-green-500/30 border-t-green-600" />
                            <span>Generando detalle…</span>
                          </div>
                        ) : null}
                        {detailError ? (
                          <p className="text-error" role="alert">
                            {detailError}
                          </p>
                        ) : null}
                        {!isDetailLoading && !detailError && detail && isDetailReady ? (
                          <div className={markdownBlockClass}>
                            <Streamdown>{normalizeMarkdown(detail.content)}</Streamdown>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <div className="flex h-full min-h-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 pt-8 pb-10 sm:px-8 xl:max-w-4xl 2xl:max-w-5xl">
        <header className="flex flex-col gap-5">
          <div className="flex items-start gap-4 sm:gap-5">
            <span className="shrink-0 text-4xl leading-none sm:text-5xl" aria-hidden>
              {topicEmoji}
            </span>
            <h1 className="text-3xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-4xl">
              {topic.title}
            </h1>
          </div>
          {topic.summary?.trim() ? (
            <div className={`max-w-[68ch] ${markdownBlockClass} text-[15px]`}>
              <Streamdown>{normalizeMarkdown(topic.summary)}</Streamdown>
            </div>
          ) : null}
        </header>

        {topic.key_points.length > 0 ? (
          <section className="flex flex-col gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Puntos clave
            </span>
            <ol className="flex flex-col gap-3 text-sm text-foreground/90">
              {topic.key_points.map((point, index) => (
                <li
                  key={`${topic.id}-key-point-${index}`}
                  className="flex items-baseline gap-4"
                >
                  <span
                    aria-hidden
                    className="shrink-0 font-mono text-xs font-medium tabular-nums text-muted-foreground/60"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className={`min-w-0 flex-1 leading-6 ${markdownInlineClass}`}>
                    <Streamdown>{normalizeMarkdown(point)}</Streamdown>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {isStale ? (
          <div
            className="rounded-xl border border-warning bg-warning/10 px-4 py-3 text-sm text-warning"
            role="alert"
          >
            Este inicio rápido está desactualizado. Regenera para ver el detalle del tema.
          </div>
        ) : null}

        {!isStale && (isExpansionLoading || shouldShowExpansionSkeleton) ? (
          <div className="flex flex-col gap-3" aria-live="polite" aria-busy="true">
            <span aria-hidden className="h-3 w-32 rounded bg-muted animate-pulse [animation-duration:1.2s]" />
            <span aria-hidden className="h-3 w-full rounded bg-muted animate-pulse [animation-duration:1.2s]" />
            <span aria-hidden className="h-3 w-11/12 rounded bg-muted animate-pulse [animation-duration:1.2s]" />
            <span aria-hidden className="h-3 w-10/12 rounded bg-muted animate-pulse [animation-duration:1.2s]" />
            <span className="sr-only">Cargando detalle del tema...</span>
          </div>
        ) : null}

        {!isStale && expansionError ? (
          <p className="text-sm text-error" role="alert">
            {expansionError}
          </p>
        ) : null}

        {!isStale && expansion ? (
          <>
            {expansion.content.trim() ? (
              <section className={`max-w-[68ch] ${markdownBlockClass} text-[15px]`}>
                <Streamdown>{normalizeMarkdown(expansion.content)}</Streamdown>
              </section>
            ) : null}

            <section className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
                  Puntos adicionales
                </h2>
                {additionalPoints.length > 0 ? (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
                    {String(additionalPoints.length).padStart(2, "0")}
                  </span>
                ) : null}
              </div>
              {renderPointsList()}
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">
                  Preguntas sugeridas
                </h2>
                {suggestedQuestions.length > 0 ? (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
                    {String(suggestedQuestions.length).padStart(2, "0")}
                  </span>
                ) : null}
              </div>
              <QuickstartQuestionsExplorer
                questions={suggestedQuestions}
                selectedDetail={selectedDetail}
                detail={detail}
                isDetailLoading={isDetailLoading}
                isDetailReady={isDetailReady}
                detailError={detailError}
                onSelect={(text) => onSelectDetail("question", text)}
              />
            </section>
          </>
        ) : null}

        <div className="h-[calc(0.5rem+env(safe-area-inset-bottom))] shrink-0" />
      </div>
    </div>
  );
}

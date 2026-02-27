import { ChevronDown } from "lucide-react";
import { Streamdown } from "streamdown";
import type {
  QuickstartDetailItemType,
  QuickstartExpansionOut,
  QuickstartTopic,
  QuickstartTopicDetailOut,
} from "../types/quickstart.types";
import { Spinner } from "../../../shared/ui/Spinner";
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
  "text-sm leading-6 text-foreground/80 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1";
const markdownInlineClass =
  "text-sm leading-6 [&_p]:m-0 [&_strong]:font-semibold [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5";

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
  const isSelected = (itemType: QuickstartDetailItemType, itemText: string) => {
    if (!selectedDetail) return false;
    return (
      selectedDetail.itemType === itemType &&
      normalizeItemText(selectedDetail.itemText).toLowerCase() ===
      normalizeItemText(itemText).toLowerCase()
    );
  };

  const shouldShowExpanded = (itemType: QuickstartDetailItemType, itemText: string) =>
    isSelected(itemType, itemText);

  return (
    <div className="flex h-full min-h-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 pt-8">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">{topic.title}</h2>
          <div className={markdownBlockClass}>
            <Streamdown>{topic.summary}</Streamdown>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
            Puntos clave
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
            {topic.key_points.map((point, index) => (
              <li key={`${topic.id}-key-point-${index}`}>
                <div className={markdownInlineClass}>
                  <Streamdown>{point}</Streamdown>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {isStale ? (
          <div
            className="rounded-xl border border-warning bg-warning/10 px-4 py-3 text-sm text-warning"
            role="alert"
          >
            Este inicio rapido esta desactualizado. Regenera para ver el detalle del tema.
          </div>
        ) : null}

        {!isStale ? (
          <>
            {isExpansionLoading || shouldShowExpansionSkeleton ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-5 shadow-sm">
                  <span
                    aria-hidden
                    className="block h-3 w-32 rounded bg-muted animate-pulse [animation-duration:1.2s]"
                  />
                  <span
                    aria-hidden
                    className="block h-3 w-full rounded bg-muted animate-pulse [animation-duration:1.2s]"
                  />
                  <span
                    aria-hidden
                    className="block h-3 w-11/12 rounded bg-muted animate-pulse [animation-duration:1.2s]"
                  />
                  <span
                    aria-hidden
                    className="block h-3 w-10/12 rounded bg-muted animate-pulse [animation-duration:1.2s]"
                  />
                </div>
                <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <span
                    aria-hidden
                    className="block h-3 w-40 rounded bg-muted animate-pulse [animation-duration:1.2s]"
                  />
                  <span
                    aria-hidden
                    className="block h-10 w-full rounded-xl bg-muted animate-pulse [animation-duration:1.2s]"
                  />
                  <span
                    aria-hidden
                    className="block h-10 w-full rounded-xl bg-muted animate-pulse [animation-duration:1.2s]"
                  />
                  <span
                    aria-hidden
                    className="block h-10 w-full rounded-xl bg-muted animate-pulse [animation-duration:1.2s]"
                  />
                </div>
                <span className="sr-only">Cargando detalle del tema...</span>
              </div>
            ) : null}

            {expansionError ? (
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm text-error" role="alert">
                  {expansionError}
                </p>
              </div>
            ) : null}

            {expansion ? (
              <>
                <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                    Informacion general
                  </p>
                  {expansion.content.trim() ? (
                    <div className={markdownBlockClass}>
                      <Streamdown>{expansion.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/75">
                      No hay informacion general disponible para este tema.
                    </p>
                  )}
                </div>

                <div className="space-y-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                      Puntos adicionales
                    </p>
                    {additionalPoints.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-border bg-surface">
                        {additionalPoints.map((point, index) => (
                          <div
                            key={`${topic.id}-additional-point-${index}`}
                            className={index > 0 ? "border-t border-border" : ""}
                          >
                            <button
                              type="button"
                              className={`group flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition ${
                                isSelected("additional_key_point", point)
                                  ? "bg-muted text-foreground"
                                  : "text-foreground hover:bg-muted/60"
                              }`}
                              aria-expanded={shouldShowExpanded("additional_key_point", point)}
                              onClick={() => onSelectDetail("additional_key_point", point)}
                            >
                              <span className="min-w-0 flex-1 text-[15px] leading-tight">
                                <span className={markdownInlineClass}>
                                  <Streamdown>{point}</Streamdown>
                                </span>
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${shouldShowExpanded("additional_key_point", point) ? "rotate-180" : ""}`}
                                aria-hidden
                              />
                            </button>

                            <div
                              className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${shouldShowExpanded("additional_key_point", point) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                            >
                              <div className="overflow-hidden">
                                <div className="border-t border-border bg-muted/30 px-4 py-3 text-sm">
                                  {isSelected("additional_key_point", point) ? (
                                    <>
                                      {isDetailLoading || (!isDetailReady && !detailError) ? (
                                        <div className="flex items-center gap-2 text-foreground/75">
                                          <Spinner className="h-4 w-4 border-green-500/30 border-t-green-600" />
                                          <span>Generando detalle...</span>
                                        </div>
                                      ) : null}

                                      {detailError ? (
                                        <p className="text-error" role="alert">
                                          {detailError}
                                        </p>
                                      ) : null}

                                      {!isDetailLoading && !detailError && detail && isDetailReady ? (
                                        <div className={markdownBlockClass}>
                                          <Streamdown>{detail.content}</Streamdown>
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/75">
                        No hay puntos adicionales para este tema.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                      Preguntas sugeridas
                    </p>
                    {suggestedQuestions.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-border bg-surface">
                        {suggestedQuestions.map((question, index) => (
                          <div
                            key={`${topic.id}-suggested-question-${index}`}
                            className={index > 0 ? "border-t border-border" : ""}
                          >
                            <button
                              type="button"
                              className={`group flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition ${
                                isSelected("question", question)
                                  ? "bg-muted text-foreground"
                                  : "text-foreground hover:bg-muted/60"
                              }`}
                              aria-expanded={shouldShowExpanded("question", question)}
                              onClick={() => onSelectDetail("question", question)}
                            >
                              <span className="min-w-0 flex-1 text-[15px] leading-tight">
                                <span className={markdownInlineClass}>
                                  <Streamdown>{question}</Streamdown>
                                </span>
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${shouldShowExpanded("question", question) ? "rotate-180" : ""}`}
                                aria-hidden
                              />
                            </button>

                            <div
                              className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${shouldShowExpanded("question", question) ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                            >
                              <div className="overflow-hidden">
                                <div className="border-t border-border bg-muted/30 px-4 py-3 text-sm">
                                  {isSelected("question", question) ? (
                                    <>
                                      {isDetailLoading || (!isDetailReady && !detailError) ? (
                                        <div className="flex items-center gap-2 text-foreground/75">
                                          <Spinner className="h-4 w-4 border-green-500/30 border-t-green-600" />
                                          <span>Generando detalle...</span>
                                        </div>
                                      ) : null}

                                      {detailError ? (
                                        <p className="text-error" role="alert">
                                          {detailError}
                                        </p>
                                      ) : null}

                                      {!isDetailLoading && !detailError && detail && isDetailReady ? (
                                        <div className={markdownBlockClass}>
                                          <Streamdown>{detail.content}</Streamdown>
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/75">
                        No hay preguntas sugeridas para este tema.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        <div className="h-[calc(1rem+env(safe-area-inset-bottom))] shrink-0" />
      </div>
    </div>
  );
}

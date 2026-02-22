import { ChevronDown, ChevronUp } from "lucide-react";
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
  detailError,
  onSelectDetail,
}: Props) {
  const additionalPoints = expansion?.key_points ?? [];
  const suggestedQuestions = expansion?.example_questions ?? [];
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
            {isExpansionLoading ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
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
                      <div className="flex flex-col gap-2">
                        {additionalPoints.map((point, index) => (
                          <div key={`${topic.id}-additional-point-${index}`}>
                            <button
                              type="button"
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                                isSelected("additional_key_point", point)
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-surface text-foreground/80 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                              }`}
                              aria-expanded={shouldShowExpanded("additional_key_point", point)}
                              onClick={() => onSelectDetail("additional_key_point", point)}
                            >
                              <span className="min-w-0 flex-1">
                                <span className={markdownInlineClass}>
                                  <Streamdown>{point}</Streamdown>
                                </span>
                              </span>
                              {shouldShowExpanded("additional_key_point", point) ? (
                                <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                              )}
                            </button>

                            {shouldShowExpanded("additional_key_point", point) ? (
                              <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm">
                                {isDetailLoading ? (
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

                                {!isDetailLoading && !detailError && detail ? (
                                  <div className={markdownBlockClass}>
                                    <Streamdown>{detail.content}</Streamdown>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
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
                      <div className="flex flex-col gap-2">
                        {suggestedQuestions.map((question, index) => (
                          <div key={`${topic.id}-suggested-question-${index}`}>
                            <button
                              type="button"
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                                isSelected("question", question)
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-surface text-foreground/80 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                              }`}
                              aria-expanded={shouldShowExpanded("question", question)}
                              onClick={() => onSelectDetail("question", question)}
                            >
                              <span className="min-w-0 flex-1">
                                <span className={markdownInlineClass}>
                                  <Streamdown>{question}</Streamdown>
                                </span>
                              </span>
                              {shouldShowExpanded("question", question) ? (
                                <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                              )}
                            </button>

                            {shouldShowExpanded("question", question) ? (
                              <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm">
                                {isDetailLoading ? (
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

                                {!isDetailLoading && !detailError && detail ? (
                                  <div className={markdownBlockClass}>
                                    <Streamdown>{detail.content}</Streamdown>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
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

import { ChevronDown, ChevronUp } from "lucide-react";
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
  const generalInfoParagraphs = (expansion?.content ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

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
    <div className="flex h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 pt-8">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">{topic.title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{topic.summary}</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Puntos clave
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {topic.key_points.map((point, index) => (
              <li key={`${topic.id}-key-point-${index}`}>{point}</li>
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
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">Cargando detalle del tema...</p>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Informacion general
                  </p>
                  {generalInfoParagraphs.length > 0 ? (
                    <div className="space-y-3">
                      {generalInfoParagraphs.map((paragraph, index) => (
                        <p
                          key={`${topic.id}-general-info-${index}`}
                          className="text-sm leading-6 text-muted-foreground"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay informacion general disponible para este tema.
                    </p>
                  )}
                </div>

                <div className="space-y-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                                  : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                              }`}
                              aria-expanded={shouldShowExpanded("additional_key_point", point)}
                              onClick={() => onSelectDetail("additional_key_point", point)}
                            >
                              <span>{point}</span>
                              {shouldShowExpanded("additional_key_point", point) ? (
                                <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                              )}
                            </button>

                            {shouldShowExpanded("additional_key_point", point) ? (
                              <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm">
                                {isDetailLoading ? (
                                  <div className="flex items-center gap-2 text-muted-foreground">
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
                                  <p className="leading-6 text-muted-foreground">{detail.content}</p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay puntos adicionales para este tema.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                                  : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                              }`}
                              aria-expanded={shouldShowExpanded("question", question)}
                              onClick={() => onSelectDetail("question", question)}
                            >
                              <span>{question}</span>
                              {shouldShowExpanded("question", question) ? (
                                <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                              )}
                            </button>

                            {shouldShowExpanded("question", question) ? (
                              <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm">
                                {isDetailLoading ? (
                                  <div className="flex items-center gap-2 text-muted-foreground">
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
                                  <p className="leading-6 text-muted-foreground">{detail.content}</p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
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

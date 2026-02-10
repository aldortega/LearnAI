import { cn } from "../../../shared/lib/cn";
import type {
  ReportFormatType,
  ReportPromptTemplate,
  ReportSuggestion,
} from "../types/reports.types";

type Props = {
  templates: ReportPromptTemplate[];
  suggestions: ReportSuggestion[];
  selectedFormatType: ReportFormatType;
  selectedSuggestionId: string | null;
  disabled: boolean;
  onSelectTemplate: (template: ReportPromptTemplate) => void;
  onSelectSuggestion: (suggestion: ReportSuggestion) => void;
};

export function ReportFormatPicker({
  templates,
  suggestions,
  selectedFormatType,
  selectedSuggestionId,
  disabled,
  onSelectTemplate,
  onSelectSuggestion,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Formatos base
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {templates.map((template) => {
            const isSelected =
              selectedFormatType === template.type && !selectedSuggestionId;
            return (
              <button
                key={template.type}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTemplate(template)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface hover:bg-muted",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <p className="text-sm font-medium text-foreground">{template.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sugerencias IA
        </p>
        {suggestions.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No hay sugerencias disponibles por ahora.
          </p>
        ) : (
          <div className="mt-2 grid gap-2">
            {suggestions.map((suggestion) => {
              const isSelected =
                selectedFormatType === "ai_suggested" &&
                selectedSuggestionId === suggestion.id;
              return (
                <button
                  key={suggestion.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectSuggestion(suggestion)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface hover:bg-muted",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {suggestion.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { Pencil, RefreshCw, Sparkles } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import type {
  ReportPromptTemplate,
  ReportSuggestion,
} from "../types/reports.types";

type Props = {
  templates: ReportPromptTemplate[];
  suggestions: ReportSuggestion[];
  disabled: boolean;
  isRefreshingSuggestions: boolean;
  onGenerateTemplate: (template: ReportPromptTemplate) => void;
  onGenerateSuggestion: (suggestion: ReportSuggestion) => void;
  onEditTemplate: (template: ReportPromptTemplate) => void;
  onEditSuggestion: (suggestion: ReportSuggestion) => void;
  onRefreshSuggestions: () => void;
};

type TemplateCardProps = {
  title: string;
  description: string;
  disabled: boolean;
  onGenerate: () => void;
  onEdit?: () => void;
};

function TemplateCard({
  title,
  description,
  disabled,
  onGenerate,
  onEdit,
}: TemplateCardProps) {
  const handleActivate = () => {
    if (disabled) return;
    onGenerate();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onGenerate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      className={cn(
        "h-[168px] flex-1 basis-0 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition",
        "flex flex-col",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {onEdit ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Editar prompt de ${title}`}
            title="Editar prompt"
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition",
              "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              disabled && "cursor-not-allowed opacity-60",
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <p className="mt-2 flex-1 overflow-hidden text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function ReportTemplatesGrid({
  templates,
  suggestions,
  disabled,
  isRefreshingSuggestions,
  onGenerateTemplate,
  onGenerateSuggestion,
  onEditTemplate,
  onEditSuggestion,
  onRefreshSuggestions,
}: Props) {
  const visibleTemplates = templates.slice(0, 4);
  const visibleSuggestions = suggestions.slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Formatos predeterminados
        </h3>
        <div className="flex gap-3">
          {visibleTemplates.map((template) => (
            <TemplateCard
              key={template.type}
              title={template.label}
              description={template.description}
              disabled={disabled}
              onGenerate={() => onGenerateTemplate(template)}
              onEdit={template.type === "freeform" ? undefined : () => onEditTemplate(template)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span>Sugeridos por IA</span>
            <Sparkles className="h-3.5 w-3.5" />
          </h3>
          <button
            type="button"
            onClick={onRefreshSuggestions}
            disabled={disabled || isRefreshingSuggestions}
            aria-label="Actualizar sugerencias de IA"
            title="Actualizar sugerencias de IA"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition",
              "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              (disabled || isRefreshingSuggestions) && "cursor-not-allowed opacity-60",
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingSuggestions && "animate-spin")} />
            <span>Actualizar</span>
          </button>
        </div>
        <div className="flex gap-3">
          {visibleSuggestions.map((suggestion) => (
            <TemplateCard
              key={suggestion.id}
              title={suggestion.title}
              description={suggestion.description}
              disabled={disabled}
              onGenerate={() => onGenerateSuggestion(suggestion)}
              onEdit={() => onEditSuggestion(suggestion)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

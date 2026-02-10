import { Button } from "../../../shared/ui/Button";
import { ReportFormatPicker } from "./ReportFormatPicker";
import { ReportPromptEditor } from "./ReportPromptEditor";
import type {
  ReportFormatType,
  ReportPromptTemplate,
  ReportSuggestion,
} from "../types/reports.types";

type Props = {
  hasReadySources: boolean;
  templates: ReportPromptTemplate[];
  suggestions: ReportSuggestion[];
  selectedFormatType: ReportFormatType;
  selectedSuggestionId: string | null;
  prompt: string;
  isGenerating: boolean;
  error: string | null;
  onSelectTemplate: (template: ReportPromptTemplate) => void;
  onSelectSuggestion: (suggestion: ReportSuggestion) => void;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
};

export function ReportGeneratePanel({
  hasReadySources,
  templates,
  suggestions,
  selectedFormatType,
  selectedSuggestionId,
  prompt,
  isGenerating,
  error,
  onSelectTemplate,
  onSelectSuggestion,
  onPromptChange,
  onGenerate,
}: Props) {
  const promptValue = prompt.trim();
  const isDisabled = !hasReadySources || isGenerating;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <ReportFormatPicker
        templates={templates}
        suggestions={suggestions}
        selectedFormatType={selectedFormatType}
        selectedSuggestionId={selectedSuggestionId}
        disabled={isGenerating}
        onSelectTemplate={onSelectTemplate}
        onSelectSuggestion={onSelectSuggestion}
      />

      <ReportPromptEditor
        value={prompt}
        disabled={isGenerating}
        onChange={onPromptChange}
      />

      {!hasReadySources ? (
        <p className="text-xs text-muted-foreground" role="alert">
          Necesitas al menos una fuente lista para generar informes.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        className="w-full"
        loading={isGenerating}
        disabled={isDisabled || !promptValue}
        onClick={onGenerate}
      >
        Generar informe
      </Button>
    </section>
  );
}

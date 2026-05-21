import { Headphones } from "lucide-react";

import { Button } from "../../../shared/ui/Button";
import { TextArea } from "../../../shared/ui/TextArea";
import { AudioDurationSelector } from "./AudioDurationSelector";
import { AudioFormatPicker } from "./AudioFormatPicker";
import { AudioTopicSuggestions } from "./AudioTopicSuggestions";
import type {
  AudioDuration,
  AudioFormatTemplate,
  AudioFormatType,
  AudioSuggestion,
} from "../types/audio.types";

type Props = {
  templates: AudioFormatTemplate[];
  suggestions: AudioSuggestion[];
  selectedFormat: AudioFormatType | null;
  selectedDuration: AudioDuration;
  topic: string;
  disabled: boolean;
  isGenerating: boolean;
  isRefreshingSuggestions: boolean;
  isSuggestionsLoading: boolean;
  isSuggestionsStale: boolean;
  canGenerate: boolean;
  generationError: string | null;
  suggestionsError: string | null;
  blockedReason: string | null;
  onSelectFormat: (format: AudioFormatType) => void;
  onSelectDuration: (duration: AudioDuration) => void;
  onTopicChange: (value: string) => void;
  onSelectSuggestion: (suggestion: AudioSuggestion) => void;
  onRefreshSuggestions: () => void;
  onGenerate: () => void;
};

export function AudioGeneratePanel({
  templates,
  suggestions,
  selectedFormat,
  selectedDuration,
  topic,
  disabled,
  isGenerating,
  isRefreshingSuggestions,
  isSuggestionsLoading,
  isSuggestionsStale,
  canGenerate,
  generationError,
  suggestionsError,
  blockedReason,
  onSelectFormat,
  onSelectDuration,
  onTopicChange,
  onSelectSuggestion,
  onRefreshSuggestions,
  onGenerate,
}: Props) {
  return (
    <div className="space-y-6">
      <AudioFormatPicker
        templates={templates}
        selectedFormat={selectedFormat}
        disabled={disabled}
        onSelect={onSelectFormat}
      />
      <AudioDurationSelector
        value={selectedDuration}
        disabled={disabled}
        onChange={onSelectDuration}
      />
      <section className="space-y-2">
        <TextArea
          label="Tema (opcional)"
          name="podcast-topic"
          value={topic}
          onChange={onTopicChange}
          placeholder="Describe el tema o enfoque del podcast. Si lo dejas vacio, la IA lo inferira de las fuentes."
          rows={3}
          inputProps={{ disabled, maxLength: 500 }}
        />
      </section>
      <AudioTopicSuggestions
        suggestions={suggestions}
        disabled={disabled}
        isLoading={isSuggestionsLoading}
        isRefreshing={isRefreshingSuggestions}
        isStale={isSuggestionsStale}
        onSelectSuggestion={onSelectSuggestion}
        onRefresh={onRefreshSuggestions}
      />
      {suggestionsError ? (
        <p className="text-sm text-error" role="alert">
          {suggestionsError}
        </p>
      ) : null}
      {generationError ? (
        <p className="text-sm text-error" role="alert">
          {generationError}
        </p>
      ) : null}
      {blockedReason ? (
        <p className="text-sm text-muted-foreground" role="alert">
          {blockedReason}
        </p>
      ) : null}
      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          onClick={onGenerate}
          disabled={!canGenerate}
          loading={isGenerating}
          leftIcon={<Headphones className="h-4 w-4" />}
        >
          Generar podcast
        </Button>
      </div>
    </div>
  );
}

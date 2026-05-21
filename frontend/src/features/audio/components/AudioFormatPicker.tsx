import { Headphones, MessageCircle, MessagesSquare, Speech } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import type { AudioFormatTemplate, AudioFormatType } from "../types/audio.types";

type Props = {
  templates: AudioFormatTemplate[];
  selectedFormat: AudioFormatType | null;
  disabled: boolean;
  onSelect: (format: AudioFormatType) => void;
};

const FORMAT_ICONS: Record<AudioFormatType, typeof Headphones> = {
  deep_dive: MessagesSquare,
  brief: Headphones,
  critique: Speech,
  debate: MessageCircle,
};

export function AudioFormatPicker({
  templates,
  selectedFormat,
  disabled,
  onSelect,
}: Props) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Formato del podcast</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const Icon = FORMAT_ICONS[template.type] ?? Headphones;
          const isSelected = selectedFormat === template.type;
          return (
            <button
              key={template.type}
              type="button"
              onClick={() => onSelect(template.type)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={cn(
                "flex h-full flex-col items-start gap-2 rounded-2xl border bg-surface p-4 text-left shadow-sm transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:bg-muted",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full",
                    isSelected
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {template.label}
                </p>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {template.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

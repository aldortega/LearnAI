import { cn } from "../../../shared/lib/cn";
import type {
  PresentationStyle,
  PresentationStyleTemplate,
} from "../types/presentations.types";

type Props = {
  styles: PresentationStyleTemplate[];
  selectedStyle: PresentationStyle;
  disabled: boolean;
  onSelectStyle: (style: PresentationStyle) => void;
};

export function PresentationStyleGrid({
  styles,
  selectedStyle,
  disabled,
  onSelectStyle,
}: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {styles.map((style) => (
        <button
          key={style.style}
          type="button"
          disabled={disabled}
          onClick={() => onSelectStyle(style.style)}
          className={cn(
            "rounded-xl border p-3 text-left transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            selectedStyle === style.style
              ? "border-primary bg-primary/10"
              : "border-border bg-surface hover:bg-muted",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <p className="text-sm font-semibold text-foreground">{style.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {style.description}
          </p>
        </button>
      ))}
    </div>
  );
}

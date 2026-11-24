import { cn } from "../../../shared/lib/cn";

type Props = {
  tone: "source" | "general";
};

export function CitationPulse({ tone }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0.5 top-1/2 h-5 -translate-y-1/2 animate-ping rounded-full motion-reduce:hidden",
        tone === "source" ? "bg-primary/40" : "bg-amber-500/50",
      )}
    />
  );
}

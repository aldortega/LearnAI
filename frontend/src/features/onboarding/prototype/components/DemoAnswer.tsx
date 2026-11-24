// PROTOTYPE — onboarding demo (throwaway).
import { CitationChip } from "../../../../shared/ui/CitationChip";
import { GeneralKnowledgeChip } from "../../../../shared/ui/GeneralKnowledgeChip";
import { DEMO_ANSWER, DEMO_CITATIONS } from "../demoData";

type Props = {
  revealedSegments: number;
  highlightCitations?: boolean;
  onCitationSeen?: () => void;
};

function Halo({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-0.5 top-1/2 h-5 -translate-y-1/2 animate-ping rounded-full ${className}`}
    />
  );
}

export function DemoAnswer({ revealedSegments, highlightCitations = false, onCitationSeen }: Props) {
  return (
    <p className="text-sm leading-relaxed text-foreground">
      {DEMO_ANSWER.slice(0, revealedSegments).map((segment, i) =>
        segment.kind === "text" ? (
          <span key={i} className="animate-fade-up">{segment.text}</span>
        ) : segment.kind === "general" ? (
          <span key={i} className="relative inline-flex align-middle">
            {highlightCitations ? <Halo className="bg-amber-500/50" /> : null}
            <GeneralKnowledgeChip />
          </span>
        ) : (
          <span
            key={i}
            onMouseEnter={onCitationSeen}
            onFocus={onCitationSeen}
            onClick={onCitationSeen}
            className="relative inline-flex align-middle"
          >
            {highlightCitations ? <Halo className="bg-primary/40" /> : null}
            <CitationChip
              label={segment.index}
              source={DEMO_CITATIONS.find((c) => c.index === segment.index) ?? null}
            />
          </span>
        ),
      )}
    </p>
  );
}

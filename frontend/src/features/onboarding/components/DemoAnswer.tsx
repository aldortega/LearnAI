import { CitationChip } from "../../../shared/ui/CitationChip";
import { GeneralKnowledgeChip } from "../../../shared/ui/GeneralKnowledgeChip";
import { DEMO_ANSWER, DEMO_CITATION } from "../utils/demoContent";
import { CitationPulse } from "./CitationPulse";

type Props = {
  revealedSegments: number;
  highlightCitations?: boolean;
};

export function DemoAnswer({ revealedSegments, highlightCitations = false }: Props) {
  return (
    <p className="text-sm leading-relaxed text-foreground">
      {DEMO_ANSWER.slice(0, revealedSegments).map((segment, i) => {
        if (segment.kind === "text") {
          return (
            <span key={i} className="animate-fade-up">
              {segment.text}
            </span>
          );
        }
        return (
          <span key={i} className="relative inline-flex align-middle">
            {highlightCitations ? <CitationPulse tone={segment.kind === "cite" ? "source" : "general"} /> : null}
            {segment.kind === "cite" ? (
              <CitationChip label={segment.index} source={DEMO_CITATION} />
            ) : (
              <GeneralKnowledgeChip />
            )}
          </span>
        );
      })}
    </p>
  );
}

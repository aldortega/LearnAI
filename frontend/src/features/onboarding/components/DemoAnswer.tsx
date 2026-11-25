import { CitationChip } from "../../../shared/ui/CitationChip";
import { GeneralKnowledgeChip } from "../../../shared/ui/GeneralKnowledgeChip";
import { DEMO_ANSWER_TOKENS, DEMO_CITATION } from "../utils/demoContent";
import { CitationPulse } from "./CitationPulse";

type Props = {
  revealedTokens?: number;
  isStreaming?: boolean;
  highlightCitations?: boolean;
};

export function DemoAnswer({
  revealedTokens = DEMO_ANSWER_TOKENS.length,
  isStreaming = false,
  highlightCitations = false,
}: Props) {
  return (
    <p className="text-sm leading-relaxed text-foreground">
      {DEMO_ANSWER_TOKENS.slice(0, revealedTokens).map((token, i) => {
        if (token.kind === "text") {
          return (
            <span key={i} className={isStreaming ? "animate-token-in motion-reduce:animate-none" : undefined}>
              {token.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className={`relative inline-flex align-middle ${isStreaming ? "animate-pop-in motion-reduce:animate-none" : ""}`}
          >
            {highlightCitations ? <CitationPulse tone={token.kind === "cite" ? "source" : "general"} /> : null}
            {token.kind === "cite" ? <CitationChip label={token.index} source={DEMO_CITATION} /> : <GeneralKnowledgeChip />}
          </span>
        );
      })}
      {isStreaming ? (
        <span
          className="ml-0.5 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-foreground align-middle motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : null}
    </p>
  );
}

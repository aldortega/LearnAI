import { useMemo, type ComponentProps } from "react";

import type { CitableSource } from "../lib/citations";
import {
  findSourceByIndex,
  linkifyCitations,
  parseCitation,
} from "../lib/citations";
import { CitationChip } from "./CitationChip";
import { GeneralKnowledgeChip } from "./GeneralKnowledgeChip";
import { Markdown } from "./Markdown";

type Props = {
  content: string;
  sources: CitableSource[];
  generalKnowledge?: boolean;
  isStreaming?: boolean;
};

const GENERAL_KNOWLEDGE_HREF = "#general-knowledge";

const STREAM_ANIMATION = {
  animation: "token-in",
  sep: "word",
  duration: 350,
  easing: "ease-out",
  stagger: 0,
} as const;

const STREAM_CARET_CLASS =
  "[&>*:last-child]:after:ml-0.5 [&>*:last-child]:after:animate-pulse motion-reduce:[&>*:last-child]:after:animate-none";

export function MarkdownWithCitations({
  content,
  sources,
  generalKnowledge = false,
  isStreaming = false,
}: Props) {
  const components = useMemo(
    () => ({
      a: ({ href, children, ...rest }: ComponentProps<"a">) => {
        if (href === GENERAL_KNOWLEDGE_HREF) return <GeneralKnowledgeChip />;
        const citation = parseCitation(href);
        if (citation === null) {
          return (
            <a href={href} {...rest}>
              {children}
            </a>
          );
        }
        const chip = (
          <CitationChip
            label={citation.label}
            source={findSourceByIndex(sources, citation.index)}
          />
        );
        if (!isStreaming) return chip;
        return (
          <span className="inline-flex align-middle animate-pop-in motion-reduce:animate-none">
            {chip}
          </span>
        );
      },
    }),
    [isStreaming, sources],
  );

  const markdown = generalKnowledge
    ? `${linkifyCitations(content).trimEnd()} [!](${GENERAL_KNOWLEDGE_HREF})`
    : linkifyCitations(content);

  return (
    <Markdown
      components={components}
      isAnimating={isStreaming}
      animated={isStreaming ? STREAM_ANIMATION : false}
      caret={isStreaming ? "circle" : undefined}
      className={isStreaming ? STREAM_CARET_CLASS : undefined}
    >
      {markdown}
    </Markdown>
  );
}

import { useMemo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";

import type { CitableSource } from "../lib/citations";
import {
  findSourceByIndex,
  linkifyCitations,
  parseCitation,
} from "../lib/citations";
import { CitationChip } from "./CitationChip";
import { GeneralKnowledgeChip } from "./GeneralKnowledgeChip";

type Props = {
  content: string;
  sources: CitableSource[];
  generalKnowledge?: boolean;
};

const GENERAL_KNOWLEDGE_HREF = "#general-knowledge";

export function MarkdownWithCitations({
  content,
  sources,
  generalKnowledge = false,
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
        return (
          <CitationChip
            label={citation.label}
            source={findSourceByIndex(sources, citation.index)}
          />
        );
      },
    }),
    [sources],
  );

  const markdown = generalKnowledge
    ? `${linkifyCitations(content).trimEnd()} [!](${GENERAL_KNOWLEDGE_HREF})`
    : linkifyCitations(content);

  return <Streamdown components={components}>{markdown}</Streamdown>;
}

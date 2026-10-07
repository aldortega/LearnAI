import { useMemo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";

import type { CitableSource } from "../lib/citations";
import {
  findSourceByIndex,
  linkifyCitations,
  parseCitation,
} from "../lib/citations";
import { CitationChip } from "./CitationChip";

type Props = {
  content: string;
  sources: CitableSource[];
};

export function MarkdownWithCitations({ content, sources }: Props) {
  const components = useMemo(
    () => ({
      a: ({ href, children, ...rest }: ComponentProps<"a">) => {
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

  return (
    <Streamdown components={components}>{linkifyCitations(content)}</Streamdown>
  );
}

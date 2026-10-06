import { useMemo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";

import type { ChatSource } from "../types/chat.types";
import {
  findSourceByIndex,
  linkifyCitations,
  parseCitation,
} from "../utils/citations";
import { CitationChip } from "./CitationChip";

type Props = {
  content: string;
  sources: ChatSource[];
};

export function ChatMarkdown({ content, sources }: Props) {
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

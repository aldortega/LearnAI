import type { ChatSource } from "../types/chat.types";

const CITATION_PATTERN = /\[(\d{1,3})\](?!\()/g;
const CITATION_HREF_PREFIX = "#cite-";

export type ParsedCitation = {
  index: number;
  label: number;
};

export function linkifyCitations(content: string): string {
  const labels = new Map<string, number>();
  return content.replace(CITATION_PATTERN, (_match, index: string) => {
    if (!labels.has(index)) labels.set(index, labels.size + 1);
    const label = labels.get(index);
    return `[${label}](${CITATION_HREF_PREFIX}${index}-${label})`;
  });
}

export function cleanSnippet(snippet: string): string {
  return snippet
    .replace(/[*`]+/g, "")
    .replace(/(^|\s)#{1,6}\s/g, "$1")
    .trim();
}

export function parseCitation(href: string | undefined): ParsedCitation | null {
  if (!href || !href.startsWith(CITATION_HREF_PREFIX)) return null;
  const [index, label] = href
    .slice(CITATION_HREF_PREFIX.length)
    .split("-")
    .map(Number);
  if (!Number.isInteger(index) || !Number.isInteger(label)) return null;
  return { index, label };
}

export function findSourceByIndex(
  sources: ChatSource[],
  index: number,
): ChatSource | null {
  return sources.find((source) => source.index === index) ?? null;
}

export function normalizeMarkdown(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

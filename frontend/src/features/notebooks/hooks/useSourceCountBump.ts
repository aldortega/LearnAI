import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const lastSeenCountByNotebook = new Map<string, number>();
let mountedNotebookId: string | null = null;

export function useSourceCountBump(count: number): boolean {
  const { notebookId } = useParams();
  const [isEntering] = useState(() => notebookId !== undefined && notebookId !== mountedNotebookId);
  const [baseline, setBaseline] = useState<{ notebookId: string; count: number } | null>(null);

  if (notebookId && count > 0 && baseline?.notebookId !== notebookId) {
    setBaseline({ notebookId, count: lastSeenCountByNotebook.get(notebookId) ?? count });
  }

  useEffect(() => {
    if (!notebookId) return;
    mountedNotebookId = notebookId;
    return () => {
      if (mountedNotebookId === notebookId) mountedNotebookId = null;
    };
  }, [notebookId]);

  useEffect(() => {
    if (notebookId && count > 0) lastSeenCountByNotebook.set(notebookId, count);
  }, [count, notebookId]);

  const hasCountChanged =
    baseline !== null && baseline.notebookId === notebookId && count !== baseline.count;
  return isEntering || hasCountChanged;
}

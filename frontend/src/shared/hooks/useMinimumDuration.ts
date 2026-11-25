import { useEffect, useState } from "react";

export function useMinimumDuration(isActive: boolean, minMs: number): boolean {
  const [startedAt] = useState<number | null>(() => (isActive ? Date.now() : null));
  const [hasElapsed, setHasElapsed] = useState(startedAt === null);

  useEffect(() => {
    if (startedAt === null) return;
    const remaining = Math.max(0, minMs - (Date.now() - startedAt));
    const timeoutId = window.setTimeout(() => setHasElapsed(true), remaining);
    return () => window.clearTimeout(timeoutId);
  }, [startedAt, minMs]);

  return isActive || !hasElapsed;
}

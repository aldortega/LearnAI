import { useEffect, useState } from "react";

import type { DemoSourceStatus } from "../types/onboarding.types";

const START_DELAY_MS = 400;
const DRAG_MS = 1000;
const HOVER_MS = 600;
const PROGRESS_TICK_MS = 70;
const PROGRESS_STEP = 4;

export type UploadDemo = {
  status: DemoSourceStatus;
  progress: number;
};

export function useUploadDemo(isActive: boolean): UploadDemo {
  const [status, setStatus] = useState<DemoSourceStatus>("none");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    let delay: number | null = null;
    let advance: () => void = () => {};

    if (status === "none") {
      delay = START_DELAY_MS;
      advance = () => setStatus("dragging");
    } else if (status === "dragging") {
      delay = DRAG_MS;
      advance = () => setStatus("hovering");
    } else if (status === "hovering") {
      delay = HOVER_MS;
      advance = () => setStatus("processing");
    } else if (status === "processing" && progress < 100) {
      delay = PROGRESS_TICK_MS;
      advance = () => setProgress((value) => Math.min(100, value + PROGRESS_STEP));
    } else if (status === "processing") {
      delay = 250;
      advance = () => setStatus("done");
    }

    if (delay === null) return;
    const timer = window.setTimeout(advance, delay);
    return () => window.clearTimeout(timer);
  }, [isActive, status, progress]);

  return { status, progress };
}

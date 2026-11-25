import { useEffect, useState } from "react";

import type { StudioMode } from "./useStudioModeItems";

const RAIL_ITEM_STEP_PX = 44;

let lastActiveMode: StudioMode | null = null;

type Result = {
  displayIndex: number;
  indicatorOffsetPx: number;
  didSwitch: boolean;
};

export function useStudioRailIndicator(modes: StudioMode[], activeMode: StudioMode | null): Result {
  const activeIndex = activeMode ? modes.indexOf(activeMode) : -1;
  const [initialIndex] = useState(() =>
    lastActiveMode ? modes.indexOf(lastActiveMode) : activeIndex,
  );
  const [displayIndex, setDisplayIndex] = useState(initialIndex);
  const didSwitch = initialIndex !== -1 && initialIndex !== activeIndex;

  useEffect(() => {
    if (activeMode) lastActiveMode = activeMode;
    const frameId = requestAnimationFrame(() => setDisplayIndex(activeIndex));
    return () => cancelAnimationFrame(frameId);
  }, [activeIndex, activeMode]);

  return {
    displayIndex,
    indicatorOffsetPx: Math.max(displayIndex, 0) * RAIL_ITEM_STEP_PX,
    didSwitch,
  };
}

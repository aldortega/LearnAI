import { createContext, useContext } from "react";

export const ModeSwitcherContext = createContext<(() => void) | null>(null);

export function useModeSwitcher(): (() => void) | null {
  return useContext(ModeSwitcherContext);
}

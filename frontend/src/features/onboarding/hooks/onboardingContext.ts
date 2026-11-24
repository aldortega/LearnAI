import { createContext } from "react";

export type OnboardingContextValue = {
  isOpen: boolean;
  openTutorial: () => void;
};

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

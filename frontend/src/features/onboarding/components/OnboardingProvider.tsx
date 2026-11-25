import { useMemo, type ReactNode } from "react";

import { OnboardingContext, type OnboardingContextValue } from "../hooks/onboardingContext";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { OnboardingCarousel } from "./OnboardingCarousel";

type Props = {
  children: ReactNode;
};

export function OnboardingProvider({ children }: Props) {
  const { isOpen, openTutorial, closeTutorial } = useOnboardingState();
  const value = useMemo<OnboardingContextValue>(() => ({ isOpen, openTutorial }), [isOpen, openTutorial]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {isOpen ? <OnboardingCarousel onClose={closeTutorial} /> : null}
    </OnboardingContext.Provider>
  );
}

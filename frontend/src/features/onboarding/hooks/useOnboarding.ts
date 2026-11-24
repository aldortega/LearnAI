import { useContext } from "react";

import { OnboardingContext, type OnboardingContextValue } from "./onboardingContext";

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding debe usarse dentro de OnboardingProvider");
  }
  return context;
}

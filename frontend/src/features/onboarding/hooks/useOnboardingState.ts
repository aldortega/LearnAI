import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../shared/hooks/useAuth";
import type { ApiError } from "../../../shared/lib/apiClient";
import { useToast } from "../../../shared/ui/toast/useToast";
import { onboardingApi } from "../api/onboardingApi";

export const OPEN_CREATE_NOTEBOOK_STATE = { openCreateNotebook: true } as const;

type OnboardingState = {
  isOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
  finishTutorial: () => void;
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return (error as ApiError).message;
  }
  return "Intentá de nuevo más tarde.";
}

export function useOnboardingState(): OnboardingState {
  const { user, refreshMe } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [isManuallyOpen, setIsManuallyOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  const shouldAutoOpen = Boolean(user?.profile_complete && user.onboarding_pending) && !hasDismissed;
  const isOpen = Boolean(user) && (isManuallyOpen || shouldAutoOpen);
  const isPending = Boolean(user?.onboarding_pending);

  const openTutorial = useCallback(() => setIsManuallyOpen(true), []);

  const closeTutorial = useCallback(() => {
    setIsManuallyOpen(false);
    setHasDismissed(true);
    if (!isPending) return;

    onboardingApi
      .complete()
      .then(() => refreshMe())
      .catch((error: unknown) => {
        pushToast({
          variant: "error",
          title: "No se pudo guardar el progreso del tutorial",
          description: getErrorMessage(error),
        });
      });
  }, [isPending, refreshMe, pushToast]);

  const finishTutorial = useCallback(() => {
    closeTutorial();
    navigate("/", { state: OPEN_CREATE_NOTEBOOK_STATE });
  }, [closeTutorial, navigate]);

  return { isOpen, openTutorial, closeTutorial, finishTutorial };
}

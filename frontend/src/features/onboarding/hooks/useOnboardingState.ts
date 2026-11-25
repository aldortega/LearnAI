import { useCallback, useState } from "react";

import { useAuth } from "../../../shared/hooks/useAuth";
import type { ApiError } from "../../../shared/lib/apiClient";
import { useToast } from "../../../shared/ui/toast/useToast";
import { onboardingApi } from "../api/onboardingApi";

type OnboardingState = {
  isOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
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
  const [isManuallyOpen, setIsManuallyOpen] = useState(false);
  const [dismissedUserId, setDismissedUserId] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const shouldAutoOpen =
    Boolean(user?.profile_complete && user.onboarding_pending) && dismissedUserId !== userId;
  const isOpen = Boolean(user) && (isManuallyOpen || shouldAutoOpen);
  const isPending = Boolean(user?.onboarding_pending);

  const openTutorial = useCallback(() => setIsManuallyOpen(true), []);

  const closeTutorial = useCallback(() => {
    setIsManuallyOpen(false);
    setDismissedUserId(userId);
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
  }, [userId, isPending, refreshMe, pushToast]);

  return { isOpen, openTutorial, closeTutorial };
}

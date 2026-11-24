import { apiRequest } from "../../../shared/lib/apiClient";
import type { AuthResponse } from "../../auth/types/auth.types";

export const onboardingApi = {
  complete: async (): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/onboarding/complete", {
      method: "POST",
    });
  },
};

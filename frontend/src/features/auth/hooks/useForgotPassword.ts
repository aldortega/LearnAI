import { useState } from "react";

import type { ForgotPasswordResponse } from "../types/auth.types";
import { authApi } from "../api/authApi";
import { toAuthErrorMessage } from "../utils/authErrors";

type Result = {
  forgotPassword: (email: string) => Promise<ForgotPasswordResponse>;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  clearError: () => void;
  resetSuccess: () => void;
};

export function useForgotPassword(): Result {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const clearError = () => setError(null);
  const resetSuccess = () => setSuccess(false);

  const forgotPassword: Result["forgotPassword"] = async (email) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await authApi.forgotPassword({ email });
      setSuccess(true);
      return res;
    } catch (e) {
      setError(toAuthErrorMessage(e));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { forgotPassword, isLoading, error, success, clearError, resetSuccess };
}

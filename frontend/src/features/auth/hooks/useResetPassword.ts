import { useState } from "react";

import type { ResetPasswordResponse } from "../types/auth.types";
import { authApi } from "../api/authApi";
import { toAuthErrorMessage } from "../utils/authErrors";

type Result = {
  resetPassword: (args: {
    token: string;
    newPassword: string;
  }) => Promise<ResetPasswordResponse>;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  clearError: () => void;
  resetSuccess: () => void;
};

export function useResetPassword(): Result {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const clearError = () => setError(null);
  const resetSuccess = () => setSuccess(false);

  const resetPassword: Result["resetPassword"] = async ({ token, newPassword }) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await authApi.resetPassword({
        token,
        new_password: newPassword,
      });
      setSuccess(true);
      return res;
    } catch (e) {
      setError(toAuthErrorMessage(e));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { resetPassword, isLoading, error, success, clearError, resetSuccess };
}

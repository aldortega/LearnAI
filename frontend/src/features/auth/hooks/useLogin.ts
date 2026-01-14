import { useState } from "react";

import type { User } from "../types/auth.types";
import { authApi } from "../api/authApi";
import { toAuthErrorMessage } from "../utils/authErrors";

type Result = {
  login: (args: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<User>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useLogin(): Result {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const login: Result["login"] = async ({ email, password, rememberMe }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.login({
        email,
        password,
        remember_me: rememberMe,
      });
      return res.user;
    } catch (e) {
      setError(toAuthErrorMessage(e));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error, clearError };
}

import { useState } from "react";

import type { User } from "../types/auth.types";
import { authApi } from "../api/authApi";
import { toAuthErrorMessage } from "../utils/authErrors";

type Result = {
  register: (args: {
    name: string;
    lastName: string;
    email: string;
    username: string;
    birthdate: string;
    password: string;
  }) => Promise<User>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useRegister(): Result {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const register: Result["register"] = async ({
    name,
    lastName,
    email,
    username,
    birthdate,
    password,
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.register({
        name,
        last_name: lastName,
        email,
        username,
        birthdate,
        password,
      });
      return res.user;
    } catch (e) {
      setError(toAuthErrorMessage(e));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { register, isLoading, error, clearError };
}

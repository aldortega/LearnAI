import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi, type LoginPayload, type RegisterPayload, type User } from "../api";
import { AuthContext } from "./AuthContext";

type Props = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await authApi.me();
        setUser(response.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authApi.login(payload);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await authApi.register(payload);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

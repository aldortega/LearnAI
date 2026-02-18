import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { authApi } from "../../features/auth/api/authApi";
import type { GoogleLoginRequest, User } from "../../features/auth/types/auth.types";
import { AuthContext, type AuthContextValue } from "./authContext";

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await refreshMe();
      } finally {
        if (isMounted) setIsBootstrapping(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refreshMe]);

  const login: AuthContextValue["login"] = useCallback(
    async ({ email, password, rememberMe }) => {
      const res = await authApi.login({
        email,
        password,
        remember_me: rememberMe,
      });
      setUser(res.user);
    },
    [],
  );

  const googleLogin: AuthContextValue["googleLogin"] = useCallback(
    async (payload: GoogleLoginRequest) => {
      const res = await authApi.googleLogin(payload);
      setUser(res.user);
    },
    [],
  );

  const completeProfile: AuthContextValue["completeProfile"] = useCallback(
    async ({ username, birthdate }) => {
      const res = await authApi.completeProfile({ username, birthdate });
      setUser(res.user);
    },
    [],
  );

  const register: AuthContextValue["register"] = useCallback(
    async ({ name, lastName, email, username, birthdate, password }) => {
      const res = await authApi.register({
        name,
        last_name: lastName,
        email,
        username,
        birthdate,
        password,
      });
      setUser(res.user);
    },
    [],
  );

  const logout: AuthContextValue["logout"] = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      refreshMe,
      login,
      googleLogin,
      completeProfile,
      register,
      logout,
    }),
    [user, isBootstrapping, refreshMe, login, googleLogin, completeProfile, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { createContext } from "react";

import type { User } from "../../features/auth/types/auth.types";

export type AuthContextValue = {
  user: User | null;
  isBootstrapping: boolean;
  refreshMe: () => Promise<void>;
  login: (args: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  completeProfile: (args: {
    username: string;
    birthdate: string;
  }) => Promise<void>;
  register: (args: {
    name: string;
    lastName: string;
    email: string;
    username: string;
    birthdate: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

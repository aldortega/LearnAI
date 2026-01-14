import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "../types/auth.types";

export const authApi = {
  me: async (): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/me", {
      method: "GET",
    });
  },

  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  register: async (payload: RegisterRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  logout: async (): Promise<void> => {
    await apiRequest<void>("/auth/logout", {
      method: "POST",
    });
  },
};

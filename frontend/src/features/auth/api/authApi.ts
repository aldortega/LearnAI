import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  AuthResponse,
  CompleteProfileRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
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

  googleLogin: async (payload: GoogleLoginRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/google", {
      method: "POST",
      body: payload,
    });
  },

  completeProfile: async (payload: CompleteProfileRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/complete-profile", {
      method: "POST",
      body: payload,
    });
  },

  logout: async (): Promise<void> => {
    await apiRequest<void>("/auth/logout", {
      method: "POST",
    });
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    return apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
      method: "POST",
      body: payload,
    });
  },

  resetPassword: async (payload: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    return apiRequest<ResetPasswordResponse>("/auth/reset-password", {
      method: "POST",
      body: payload,
    });
  },
};

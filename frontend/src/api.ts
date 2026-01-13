const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type User = {
  id: string;
  name: string;
  last_name: string;
  email: string;
  username: string;
  birthdate: string;
};

type AuthResponse = {
  user: User;
};

export type RegisterPayload = {
  name: string;
  last_name: string;
  email: string;
  username: string;
  birthdate: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
  remember_me: boolean;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Error inesperado";
    try {
      const data = await response.json();
      message = data?.detail ?? message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

export const authApi = {
  async me(): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/me");
  },
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async logout(): Promise<void> {
    await request<void>("/auth/logout", { method: "POST" });
  },
};

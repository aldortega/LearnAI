import { authApi, type LoginPayload, type RegisterPayload, type User } from "../api";

export type { LoginPayload, RegisterPayload, User };

export async function register(payload: RegisterPayload): Promise<User> {
  const data = await authApi.register(payload);
  return data.user;
}

export async function login(payload: LoginPayload): Promise<User> {
  const data = await authApi.login(payload);
  return data.user;
}

export async function logout(): Promise<void> {
  await authApi.logout();
}

export async function getMe(): Promise<User> {
  const data = await authApi.me();
  return data.user;
}

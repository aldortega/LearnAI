export type User = {
  id: string;
  name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  username: string | null;
  birthdate: string | null;
  profile_complete: boolean;
};

export type AuthResponse = {
  user: User;
};

export type LoginRequest = {
  email: string;
  password: string;
  remember_me: boolean;
};

export type GoogleLoginRequest =
  | {
      credential: string;
      access_token?: never;
    }
  | {
      access_token: string;
      credential?: never;
    };

export type CompleteProfileRequest = {
  username: string;
  birthdate: string;
};

export type RegisterRequest = {
  name: string;
  last_name: string;
  email: string;
  username: string;
  birthdate: string;
  password: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordRequest = {
  token: string;
  new_password: string;
};

export type ResetPasswordResponse = {
  message: string;
};

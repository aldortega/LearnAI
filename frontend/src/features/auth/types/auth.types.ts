export type User = {
  id: string;
  name: string;
  last_name: string;
  email: string;
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

export type GoogleLoginRequest = {
  credential: string;
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

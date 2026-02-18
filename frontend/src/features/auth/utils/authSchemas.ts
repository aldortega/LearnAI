import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Ingresá un email válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginSchemaInput = z.input<typeof loginSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Ingresá un email válido"),
  username: z.string().min(3, "Mínimo 3 caracteres"),
  birthdate: z.string().min(1, "La fecha de nacimiento es obligatoria"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type RegisterSchema = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Ingresá un email válido"),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token inválido"),
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

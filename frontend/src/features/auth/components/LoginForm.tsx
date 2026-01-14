import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";

import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { cn } from "../../../shared/lib/cn";
import { useAuth } from "../../../shared/hooks/useAuth";
import {
  loginSchema,
  type LoginSchema,
  type LoginSchemaInput,
} from "../utils/authSchemas";

export function LoginForm() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginSchemaInput) => {
    setFormError(null);

    const parsed: LoginSchema = loginSchema.parse(values);

    try {
      await login({
        email: parsed.email.trim(),
        password: parsed.password,
        rememberMe: parsed.rememberMe,
      });
    } catch (e) {
      const msg = (e as { message?: string }).message;
      setFormError(msg ?? "No se pudo iniciar sesión");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
        >
          {formError}
        </div>
      ) : null}

      <TextField
        label="Email"
        name="email"
        placeholder="student@university.edu"
        autoComplete="email"
        required
        error={errors.email?.message}
        rightAdornment={<Mail className="h-4 w-4" aria-hidden />}
        inputProps={register("email")}
      />

      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        inputProps={register("password")}
      />

      <div className="flex items-center justify-between gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            {...register("rememberMe")}
            className={cn(
              "h-4 w-4 rounded border-zinc-300 text-emerald-700",
              "focus:ring-emerald-500 focus:ring-2 focus:ring-offset-2",
            )}
          />
          Recordarme
        </label>

        <button
          type="button"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          onClick={() => setFormError("Recuperación de contraseña: pendiente")}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Iniciar sesión
      </Button>
    </form>
  );
}

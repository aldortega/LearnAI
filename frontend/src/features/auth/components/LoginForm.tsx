import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { cn } from "../../../shared/lib/cn";
import { useAuth } from "../../../shared/hooks/useAuth";
import {
  loginSchema,
  type LoginSchema,
  type LoginSchemaInput,
} from "../utils/authSchemas";
import { GoogleLoginButton } from "./GoogleLoginButton";

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
          className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
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
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">

          <input
            type="checkbox"
            {...register("rememberMe")}
            className={cn(
              "h-4 w-4 rounded border-border-strong text-primary",
              "focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:ring-offset-white",
              "dark:focus:ring-primary",
            )}
          />
          Recordarme
        </label>

        <Link
          to="/forgot-password"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Iniciar sesión
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-surface px-3 text-muted-foreground">
            o continuar con
          </span>
        </div>
      </div>

      <div className="flex justify-center">
        <GoogleLoginButton onError={setFormError} />
      </div>
    </form>
  );
}




import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { AuthShell } from "../components/AuthShell";
import { useResetPassword } from "../hooks/useResetPassword";
import {
  resetPasswordSchema,
  type ResetPasswordSchema,
} from "../utils/authSchemas";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { resetPassword, isLoading, error, success, clearError } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token) {
      navigate("/");
    }
  }, [token, navigate]);

  const onSubmit = async (values: ResetPasswordSchema) => {
    clearError();
    try {
      await resetPassword({
        token: values.token,
        newPassword: values.newPassword,
      });
    } catch {
      // Error is handled by hook
    }
  };

  if (success) {
    return (
      <AuthShell
        title="¡Contraseña actualizada!"
        subtitle="Tu contraseña ha sido cambiada exitosamente"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Tu contraseña ha sido actualizada. Ahora podés iniciar sesión con tu nueva contraseña.
            </p>
          </div>

          <Link to="/">
            <Button variant="primary" className="w-full">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crear nueva contraseña"
      subtitle="Ingresá tu nueva contraseña"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <TextField
          label="Nueva contraseña"
          name="newPassword"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          required
          error={errors.newPassword?.message}
          rightAdornment={<Lock className="h-4 w-4" aria-hidden />}
          inputProps={register("newPassword")}
        />

        <TextField
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          placeholder="Repetí tu contraseña"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          rightAdornment={<Lock className="h-4 w-4" aria-hidden />}
          inputProps={register("confirmPassword")}
        />

        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          className="w-full"
        >
          Actualizar contraseña
        </Button>

        <Link
          to="/"
          className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      </form>
    </AuthShell>
  );
}

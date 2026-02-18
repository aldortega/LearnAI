import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { AuthShell } from "../components/AuthShell";
import { useForgotPassword } from "../hooks/useForgotPassword";
import {
  forgotPasswordSchema,
  type ForgotPasswordSchema,
} from "../utils/authSchemas";

export function ForgotPasswordPage() {
  const { forgotPassword, isLoading, error, success, clearError } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordSchema) => {
    clearError();
    try {
      await forgotPassword(values.email.trim());
    } catch {
      // Error is handled by hook
    }
  };

  if (success) {
    return (
      <AuthShell
        title="¡Revisá tu email!"
        subtitle="Te enviamos instrucciones para restablecer tu contraseña"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Si existe una cuenta con ese email, recibirás un enlace para crear una nueva contraseña. El enlace expirará en 1 hora.
            </p>
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="¿Olvidaste tu contraseña?"
      subtitle="Ingresá tu email y te enviaremos instrucciones para restablecerla"
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
          label="Email"
          name="email"
          placeholder="student@university.edu"
          autoComplete="email"
          required
          error={errors.email?.message}
          rightAdornment={<Mail className="h-4 w-4" aria-hidden />}
          inputProps={register("email")}
        />

        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          className="w-full"
        >
          Enviar instrucciones
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

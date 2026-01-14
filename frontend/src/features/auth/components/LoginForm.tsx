import { useMemo, useState } from "react";

import { Mail } from "lucide-react";

import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { cn } from "../../../shared/lib/cn";
import { useAuth } from "../../../shared/hooks/useAuth";

export function LoginForm() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailError = useMemo(() => {
    if (!email.trim()) return "El email es obligatorio";
    if (!/\S+@\S+\.\S+/.test(email)) return "Ingresá un email válido";
    return null;
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "La contraseña es obligatoria";
    return null;
  }, [password]);

  const canSubmit = !emailError && !passwordError && !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!canSubmit) {
      setFormError("Revisá los campos marcados");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        email: email.trim(),
        password,
        rememberMe,
      });
    } catch (e) {
      const msg = (e as { message?: string }).message;
      setFormError(msg ?? "No se pudo iniciar sesión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError ? (
        <div
          role="alert"
          className="rounded-2xl bg-[color:var(--color-fern-50)] px-4 py-3 text-sm text-[color:var(--color-fern-800)] ring-1 ring-[color:var(--color-fern-200)]"
        >
          {formError}
        </div>
      ) : null}

      <TextField
        label="Email"
        name="email"
        value={email}
        onChange={setEmail}
        placeholder="student@university.edu"
        type="email"
        autoComplete="email"
        required
        error={email ? emailError ?? undefined : undefined}
        rightAdornment={<Mail className="h-5 w-5" aria-hidden />}
      />

      <TextField
        label="Contraseña"
        name="password"
        value={password}
        onChange={setPassword}
        type="password"
        autoComplete="current-password"
        required
        error={password ? passwordError ?? undefined : undefined}
      />

      <div className="flex items-center justify-between gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-[color:var(--color-fern-700)]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className={cn(
              "h-4 w-4 rounded border-[color:var(--color-fern-300)]",
              "text-[color:var(--color-fern-600)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-green-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            )}
          />
          Recordarme
        </label>

        <button
          type="button"
          className="text-sm font-semibold text-[color:var(--color-fern-600)] hover:text-[color:var(--color-fern-800)]"
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

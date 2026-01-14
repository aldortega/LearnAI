import { useMemo, useState } from "react";

import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { useAuth } from "../../../shared/hooks/useAuth";

export function RegisterForm() {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nameError = useMemo(() => {
    if (!name.trim()) return "El nombre es obligatorio";
    if (name.trim().length < 2) return "Mínimo 2 caracteres";
    return null;
  }, [name]);

  const lastNameError = useMemo(() => {
    if (!lastName.trim()) return "El apellido es obligatorio";
    if (lastName.trim().length < 2) return "Mínimo 2 caracteres";
    return null;
  }, [lastName]);

  const emailError = useMemo(() => {
    if (!email.trim()) return "El email es obligatorio";
    if (!/\S+@\S+\.\S+/.test(email)) return "Ingresá un email válido";
    return null;
  }, [email]);

  const usernameError = useMemo(() => {
    if (!username.trim()) return "El username es obligatorio";
    if (username.trim().length < 3) return "Mínimo 3 caracteres";
    return null;
  }, [username]);

  const birthdateError = useMemo(() => {
    if (!birthdate) return "La fecha de nacimiento es obligatoria";
    return null;
  }, [birthdate]);

  const passwordError = useMemo(() => {
    if (!password) return "La contraseña es obligatoria";
    if (password.length < 8) return "Mínimo 8 caracteres";
    return null;
  }, [password]);

  const canSubmit =
    !nameError &&
    !lastNameError &&
    !emailError &&
    !usernameError &&
    !birthdateError &&
    !passwordError &&
    !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!canSubmit) {
      setFormError("Revisá los campos marcados");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        username: username.trim(),
        birthdate,
        password,
      });
    } catch (e) {
      const msg = (e as { message?: string }).message;
      setFormError(msg ?? "No se pudo crear la cuenta");
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Nombre"
          name="name"
          value={name}
          onChange={setName}
          placeholder="Aldo"
          required
          error={name ? (nameError ?? undefined) : undefined}
          autoComplete="given-name"
        />
        <TextField
          label="Apellido"
          name="lastName"
          value={lastName}
          onChange={setLastName}
          placeholder="García"
          required
          error={lastName ? (lastNameError ?? undefined) : undefined}
          autoComplete="family-name"
        />
      </div>

      <TextField
        label="Email"
        name="email"
        value={email}
        onChange={setEmail}
        placeholder="student@university.edu"
        type="email"
        required
        error={email ? (emailError ?? undefined) : undefined}
        autoComplete="email"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Nombre de usuario"
          name="username"
          value={username}
          onChange={setUsername}
          placeholder="student123"
          required
          error={username ? (usernameError ?? undefined) : undefined}
          autoComplete="username"
        />
        <TextField
          label="Fecha de nacimiento"
          name="birthdate"
          value={birthdate}
          onChange={setBirthdate}
          type="date"
          required
          error={birthdate ? (birthdateError ?? undefined) : undefined}
          autoComplete="bday"
        />
      </div>

      <TextField
        label="Contraseña"
        name="password"
        value={password}
        onChange={setPassword}
        type="password"
        required
        error={password ? (passwordError ?? undefined) : undefined}
        autoComplete="new-password"
      />

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Crear cuenta
      </Button>
    </form>
  );
}

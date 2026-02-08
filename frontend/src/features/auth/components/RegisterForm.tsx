import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { useAuth } from "../../../shared/hooks/useAuth";
import { registerSchema, type RegisterSchema } from "../utils/authSchemas";

export function RegisterForm() {
  const { register } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      lastName: "",
      email: "",
      username: "",
      birthdate: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterSchema) => {
    setFormError(null);

    try {
      await register({
        name: values.name.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        username: values.username.trim(),
        birthdate: values.birthdate,
        password: values.password,
      });
    } catch (e) {
      const msg = (e as { message?: string }).message;
      setFormError(msg ?? "No se pudo crear la cuenta");
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Nombre"
          name="name"
          placeholder="Aldo"
          required
          error={errors.name?.message}
          autoComplete="given-name"
          inputProps={registerField("name")}
        />
        <TextField
          label="Apellido"
          name="lastName"
          placeholder="García"
          required
          error={errors.lastName?.message}
          autoComplete="family-name"
          inputProps={registerField("lastName")}
        />
      </div>

      <TextField
        label="Email"
        name="email"
        placeholder="student@university.edu"
        type="email"
        required
        error={errors.email?.message}
        autoComplete="email"
        inputProps={registerField("email")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Nombre de usuario"
          name="username"
          placeholder="student123"
          required
          error={errors.username?.message}
          autoComplete="username"
          inputProps={registerField("username")}
        />
        <TextField
          label="Fecha de nacimiento"
          name="birthdate"
          type="date"
          required
          error={errors.birthdate?.message}
          autoComplete="bday"
          inputProps={registerField("birthdate")}
        />
      </div>

      <TextField
        label="Contraseña"
        name="password"
        type="password"
        required
        error={errors.password?.message}
        autoComplete="new-password"
        inputProps={registerField("password")}
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



import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { useAuth } from "../../../shared/hooks/useAuth";
import { AuthShell } from "../components/AuthShell";

const completeProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres"),
  birthdate: z.string().min(1, "Campo requerido"),
});

type CompleteProfileSchema = z.infer<typeof completeProfileSchema>;

export function CompleteProfilePage() {
  const { completeProfile, user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileSchema>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      username: "",
      birthdate: "",
    },
  });

  const onSubmit = async (values: CompleteProfileSchema) => {
    setFormError(null);

    try {
      await completeProfile({
        username: values.username.trim(),
        birthdate: values.birthdate,
      });
    } catch (e) {
      const msg = (e as { message?: string }).message;
      setFormError(msg ?? "No se pudo completar el perfil");
    }
  };

  return (
    <AuthShell
      title="Completá tu perfil"
      subtitle={`Hola ${user?.name ?? ""}, necesitamos algunos datos más para continuar.`}
    >
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
          label="Nombre de usuario"
          name="username"
          placeholder="student123"
          required
          error={errors.username?.message}
          autoComplete="username"
          inputProps={register("username")}
        />

        <TextField
          label="Fecha de nacimiento"
          name="birthdate"
          type="date"
          required
          error={errors.birthdate?.message}
          autoComplete="bday"
          inputProps={register("birthdate")}
        />

        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          className="w-full"
        >
          Continuar
        </Button>
      </form>
    </AuthShell>
  );
}



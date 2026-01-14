import { useMemo, useState } from "react";

import { Tabs } from "../../../shared/ui/Tabs";
import { AuthShell } from "../components/AuthShell";
import { LoginForm } from "../components/LoginForm";
import { RegisterForm } from "../components/RegisterForm";

type AuthMode = "login" | "register";

type Props = {
  initialMode?: AuthMode;
};

export function AuthPage({ initialMode = "login" }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const title = mode === "login" ? "Bienvenido" : "Completa tus datos";
  const subtitle =
    mode === "login"
      ? "Ingresá tus datos para acceder."
      : "Creá tu cuenta para empezar a estudiar mejor.";

  const tabs = useMemo(
    () => [
      { value: "login" as const, label: "Ingresar" },
      { value: "register" as const, label: "Crear cuenta" },
    ],
    [],
  );

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      topSlot={<Tabs value={mode} onChange={setMode} tabs={tabs} />}
    >
      {mode === "login" ? <LoginForm /> : <RegisterForm />}
    </AuthShell>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const initialLogin = {
  email: "",
  password: "",
  remember_me: false,
};

const initialRegister = {
  name: "",
  last_name: "",
  email: "",
  username: "",
  birthdate: "",
  password: "",
};

export const AuthPage = () => {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginData, setLoginData] = useState(initialLogin);
  const [registerData, setRegisterData] = useState(initialRegister);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const tabClass = (value: "login" | "register") =>
    value === tab
      ? "bg-md-primary text-white shadow-md"
      : "text-md-primary hover:bg-md-primary/10";

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(loginData);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(registerData);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setIsSubmitting(false);
    }
  };

  const headline = useMemo(
    () => (tab === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"),
    [tab],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-md-surface text-md-on-surface">
      <div
        className="pointer-events-none absolute -left-40 top-24 h-72 w-72 rounded-full bg-md-primary/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-48 top-10 h-96 w-96 rounded-full bg-md-tertiary/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-md-secondary-container/40 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-[32px] bg-md-surface-container p-8 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:shadow-md">
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-md-secondary-container px-4 py-1 text-sm font-medium text-md-on-secondary-container">
              LearnAI
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-md-on-surface">
              {headline}
            </h1>
            <p className="mt-2 text-base text-md-on-surface-variant">
              Estudia con tu propio contenido, a tu ritmo y con feedback
              inmediato.
            </p>
          </div>

          <div className="mb-8 flex rounded-full bg-md-surface-container-low p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${tabClass(
                "login",
              )}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${tabClass(
                "register",
              )}`}
            >
              Crear cuenta
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-md-primary/20 bg-md-primary/10 px-4 py-3 text-sm text-md-on-surface">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form className="space-y-5" onSubmit={handleLogin}>
              <Field
                label="Correo"
                type="email"
                value={loginData.email}
                onChange={(value) =>
                  setLoginData({ ...loginData, email: value })
                }
              />
              <Field
                label="Contraseña"
                type="password"
                value={loginData.password}
                onChange={(value) =>
                  setLoginData({ ...loginData, password: value })
                }
              />
              <label className="flex items-center gap-2 text-sm text-md-on-surface-variant">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-md-outline text-md-primary focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2"
                  checked={loginData.remember_me}
                  onChange={(event) =>
                    setLoginData({
                      ...loginData,
                      remember_me: event.target.checked,
                    })
                  }
                />
                Recuérdame por 7 días
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-full bg-md-primary px-6 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-md-primary/90 hover:shadow-md active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? "Ingresando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleRegister}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nombre"
                  value={registerData.name}
                  onChange={(value) =>
                    setRegisterData({ ...registerData, name: value })
                  }
                />
                <Field
                  label="Apellido"
                  value={registerData.last_name}
                  onChange={(value) =>
                    setRegisterData({ ...registerData, last_name: value })
                  }
                />
              </div>
              <Field
                label="Correo"
                type="email"
                value={registerData.email}
                onChange={(value) =>
                  setRegisterData({ ...registerData, email: value })
                }
              />
              <Field
                label="Username"
                value={registerData.username}
                onChange={(value) =>
                  setRegisterData({ ...registerData, username: value })
                }
              />
              <Field
                label="Fecha de nacimiento"
                type="date"
                value={registerData.birthdate}
                onChange={(value) =>
                  setRegisterData({ ...registerData, birthdate: value })
                }
              />
              <Field
                label="Contraseña"
                type="password"
                value={registerData.password}
                onChange={(value) =>
                  setRegisterData({ ...registerData, password: value })
                }
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-full bg-md-primary px-6 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-md-primary/90 hover:shadow-md active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

type FieldProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
};

const Field = ({ label, type = "text", value, onChange }: FieldProps) => {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-md-on-surface-variant">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="md-input"
      />
    </label>
  );
};

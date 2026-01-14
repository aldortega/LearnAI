import { useState } from "react";

import { useAuth } from "../../../shared/hooks/useAuth";
import { Card } from "../../../shared/ui/Card";
import { HomeHeader } from "../components/HomeHeader";

export function HomePage() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[color:var(--color-frosted-mint-50)]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <HomeHeader
          name={user.name}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <div className="text-sm font-semibold text-[color:var(--color-fern-950)]">
              Cuenta
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[color:var(--color-fern-600)]">
                  Email
                </span>
                <span className="font-semibold text-[color:var(--color-fern-900)]">
                  {user.email}
                </span>
              </div>
              <div className="h-px bg-[color:var(--color-fern-100)]" />
              <div className="flex items-center justify-between gap-4">
                <span className="text-[color:var(--color-fern-600)]">
                  Username
                </span>
                <span className="font-semibold text-[color:var(--color-fern-900)]">
                  {user.username}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-[color:var(--color-fern-950)]">
              Próximos pasos
            </div>
            <p className="mt-3 text-sm leading-6 text-[color:var(--color-fern-600)]">
              Subí un PDF o tus apuntes para empezar a generar resúmenes y
              quizzes.
            </p>
            <div className="mt-4 rounded-2xl bg-[color:var(--color-fern-50)] px-4 py-3 text-sm text-[color:var(--color-fern-700)] ring-1 ring-[color:var(--color-fern-100)]">
              Integración de documentos: pendiente.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

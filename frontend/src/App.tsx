import { AuthProvider } from "./app/providers/AuthProvider";
import { AuthPage } from "./features/auth/pages/AuthPage";
import { HomePage } from "./features/home/pages/HomePage";
import { useAuth } from "./shared/hooks/useAuth";

function AppInner() {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-[color:var(--color-frosted-mint-50)]">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="rounded-3xl bg-white/70 px-6 py-5 text-sm font-semibold text-[color:var(--color-fern-700)] ring-1 ring-[color:var(--color-fern-100)] backdrop-blur-xl">
            Cargando…
          </div>
        </div>
      </div>
    );
  }

  return user ? <HomePage /> : <AuthPage initialMode="login" />;
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;

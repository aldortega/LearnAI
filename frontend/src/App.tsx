import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./app/providers/AuthProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { AuthPage } from "./features/auth/pages/AuthPage";
import { HomePage } from "./features/home/pages/HomePage";
import { NotebookPage } from "./features/notebooks/pages/NotebookPage";
import { useAuth } from "./shared/hooks/useAuth";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-emerald-50 dark:bg-zinc-950">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="rounded-3xl bg-white/70 px-6 py-5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100 backdrop-blur-xl dark:bg-zinc-900/70 dark:text-emerald-200 dark:ring-emerald-500/30">
            Cargando…
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage initialMode="login" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId"
              element={
                <ProtectedRoute>
                  <NotebookPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { AuthProvider } from "./app/providers/AuthProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { AuthPage } from "./features/auth/pages/AuthPage";
import { CompleteProfilePage } from "./features/auth/pages/CompleteProfilePage";
import { HomePage } from "./features/home/pages/HomePage";
import { NotebookPage } from "./features/notebooks/pages/NotebookPage";
import { NotebookQuickstartPage } from "./features/quickstart/pages/NotebookQuickstartPage";
import { NotebookQuizPage } from "./features/quiz/pages/NotebookQuizPage";
import { useAuth } from "./shared/hooks/useAuth";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-primary/10">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="rounded-3xl bg-surface/70 px-6 py-5 text-sm font-semibold text-primary ring-1 ring-border backdrop-blur-xl dark:ring-primary/30">
            Cargando…
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage initialMode="login" />;
  }

  // Redirect to profile completion if user has incomplete profile
  if (!user.profile_complete) {
    return <CompleteProfilePage />;
  }

  return <>{children}</>;
}

function NotebookRedirect() {
  const { notebookId } = useParams();

  if (!notebookId) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/notebook/${notebookId}/quickstart`} replace />;
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
                  <NotebookRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/chat"
              element={
                <ProtectedRoute>
                  <NotebookPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/quickstart"
              element={
                <ProtectedRoute>
                  <NotebookQuickstartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/quiz"
              element={
                <ProtectedRoute>
                  <NotebookQuizPage />
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




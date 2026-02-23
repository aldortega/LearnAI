import type { ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";

import { AuthProvider } from "./app/providers/AuthProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { AuthPage } from "./features/auth/pages/AuthPage";
import { CompleteProfilePage } from "./features/auth/pages/CompleteProfilePage";
import { ForgotPasswordPage } from "./features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./features/auth/pages/ResetPasswordPage";
import { NotebookFlashcardsPage } from "./features/flashcards/pages/NotebookFlashcardsPage";
import { HomePage } from "./features/home/pages/HomePage";
import { useNotebookReadySources } from "./features/notebooks";
import { NotebookMindmapPage } from "./features/mindmap/pages/NotebookMindmapPage";
import { NotebookPage } from "./features/notebooks/pages/NotebookPage";
import { NotebookQuickstartPage } from "./features/quickstart/pages/NotebookQuickstartPage";
import { NotebookQuickstartTopicPage } from "./features/quickstart/pages/NotebookQuickstartTopicPage";
import { NotebookQuizPage } from "./features/quiz/pages/NotebookQuizPage";
import { NotebookReportsPage } from "./features/reports/pages/NotebookReportsPage";
import { useAuth } from "./shared/hooks/useAuth";
import { NotebookLoadingScreen } from "./shared/ui/NotebookLoadingScreen";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <NotebookLoadingScreen message="Cargando..." />;
  }

  if (!user) {
    return <AuthPage initialMode="login" />;
  }

  if (!user.profile_complete) {
    return <CompleteProfilePage />;
  }

  return <>{children}</>;
}

function NotebookEntryRoute() {
  const { notebookId } = useParams();
  const { hasReadySources, isResolving } = useNotebookReadySources(notebookId);

  if (!notebookId) {
    return <Navigate to="/" replace />;
  }

  if (isResolving) {
    return <NotebookLoadingScreen />;
  }

  if (hasReadySources) {
    return <Navigate to={`/notebook/${notebookId}/quickstart`} replace />;
  }

  return <NotebookPage redirectWhenReady />;
}

function RequireReadySources({ children }: { children: ReactNode }) {
  const { notebookId } = useParams();
  const { hasReadySources, isResolving } = useNotebookReadySources(notebookId);

  if (!notebookId) {
    return <Navigate to="/" replace />;
  }

  if (isResolving) {
    return <NotebookLoadingScreen />;
  }

  if (!hasReadySources) {
    return <Navigate to={`/notebook/${notebookId}`} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes (no auth required) */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes */}
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
                  <NotebookEntryRoute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/chat"
              element={
                <ProtectedRoute>
                  <RequireReadySources>
                    <NotebookPage />
                  </RequireReadySources>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/quickstart"
              element={
                <ProtectedRoute>
                  <RequireReadySources>
                    <NotebookQuickstartPage />
                  </RequireReadySources>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/quickstart/topic/:topicId"
              element={
                <ProtectedRoute>
                  <RequireReadySources>
                    <NotebookQuickstartTopicPage />
                  </RequireReadySources>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/quiz"
              element={
                <ProtectedRoute>
                  <RequireReadySources>
                    <NotebookQuizPage />
                  </RequireReadySources>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/reports"
              element={
                <ProtectedRoute>
                  <RequireReadySources>
                    <NotebookReportsPage />
                  </RequireReadySources>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/flashcards"
              element={
                <ProtectedRoute>
                  <RequireReadySources>
                    <NotebookFlashcardsPage />
                  </RequireReadySources>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/mindmap"
              element={
                <ProtectedRoute>
                  <RequireReadySources>
                    <NotebookMindmapPage />
                  </RequireReadySources>
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

import type { ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";

import { AuthProvider } from "./app/providers/AuthProvider";
import { GenerationMonitorProvider } from "./shared/generation/GenerationMonitorProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { AuthPage } from "./features/auth/pages/AuthPage";
import { CompleteProfilePage } from "./features/auth/pages/CompleteProfilePage";
import { ForgotPasswordPage } from "./features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./features/auth/pages/ResetPasswordPage";
import { NotebookAudioPage } from "./features/audio/pages/NotebookAudioPage";
import { NotebookFlashcardsPage } from "./features/flashcards/pages/NotebookFlashcardsPage";
import { HomePage } from "./features/home/pages/HomePage";
import { useNotebookPrefetch, useNotebookReadySources } from "./features/notebooks";
import { NotebookMindmapPage } from "./features/mindmap/pages/NotebookMindmapPage";
import { NotebookPage } from "./features/notebooks/pages/NotebookPage";
import { NotebookQuickstartPage } from "./features/quickstart/pages/NotebookQuickstartPage";
import { NotebookQuickstartTopicPage } from "./features/quickstart/pages/NotebookQuickstartTopicPage";
import { NotebookQuizPage } from "./features/quiz/pages/NotebookQuizPage";
import { NotebookPresentationsPage } from "./features/presentations/pages/NotebookPresentationsPage";
import { NotebookReportsPage } from "./features/reports/pages/NotebookReportsPage";
import { useAuth } from "./shared/hooks/useAuth";
import { ToastProvider } from "./shared/ui/toast/ToastProvider";
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
  const { isPrefetching } = useNotebookPrefetch(notebookId, hasReadySources);

  if (!notebookId) {
    return <Navigate to="/" replace />;
  }

  if (isResolving || (hasReadySources && isPrefetching)) {
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
  const { isPrefetching } = useNotebookPrefetch(notebookId, hasReadySources);

  if (!notebookId) {
    return <Navigate to="/" replace />;
  }

  if (isResolving || (hasReadySources && isPrefetching)) {
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
          <ToastProvider>
            <GenerationMonitorProvider>
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
                        <NotebookReportsPage routeMode="list" />
                      </RequireReadySources>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notebook/:notebookId/reports/new"
                  element={
                    <ProtectedRoute>
                      <RequireReadySources>
                        <NotebookReportsPage routeMode="new" />
                      </RequireReadySources>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notebook/:notebookId/presentations"
                  element={
                    <ProtectedRoute>
                      <RequireReadySources>
                        <NotebookPresentationsPage routeMode="list" />
                      </RequireReadySources>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notebook/:notebookId/presentations/new"
                  element={
                    <ProtectedRoute>
                      <RequireReadySources>
                        <NotebookPresentationsPage routeMode="new" />
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
                  path="/notebook/:notebookId/audio"
                  element={
                    <ProtectedRoute>
                      <RequireReadySources>
                        <NotebookAudioPage />
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
            </GenerationMonitorProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

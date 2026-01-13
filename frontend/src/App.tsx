import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { HomePage } from "./pages/HomePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;

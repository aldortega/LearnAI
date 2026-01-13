import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

type Props = {
  children: React.ReactNode;
};

export const ProtectedRoute = ({ children }: Props) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-md-surface text-md-on-surface flex items-center justify-center">
        <div className="rounded-2xl bg-md-surface-container px-6 py-4 shadow-sm">
          Cargando...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

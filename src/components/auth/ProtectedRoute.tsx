import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

// Development mode bypass - set to true to skip authentication
const DEV_BYPASS_AUTH = false;

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, hasAccess } = useAuth();
  const location = useLocation();

  // Skip auth check in development mode
  if (DEV_BYPASS_AUTH) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (!hasAccess(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

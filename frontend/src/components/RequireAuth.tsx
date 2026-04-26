import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '../store/auth';

type UserRole = 'CUSTOMER' | 'EVENT_ORGANIZER';

type RequireAuthProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
};

export default function RequireAuth({
  children,
  allowedRoles,
  redirectTo = '/',
}: RequireAuthProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-32 rounded-full bg-slate-200 animate-pulse" />
          <div className="mt-4 h-4 w-full rounded-full bg-slate-100 animate-pulse" />
          <div className="mt-2 h-4 w-5/6 rounded-full bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
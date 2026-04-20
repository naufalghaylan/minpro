import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

type UserRole = 'CUSTOMER' | 'EVENT_ORGANIZER';

type RequireRoleProps = {
  children: ReactNode;
  allow: UserRole[];
};

export default function RequireRole({ children, allow }: RequireRoleProps) {
  const user = useAuthStore((state) => state.user);

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
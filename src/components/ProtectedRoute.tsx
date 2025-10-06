import React, { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './ui/LoadingScreen';

export enum UserRole {
  Teacher = 'teacher',
  Student = 'student',
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = memo(({ children, requiredRole }) => {
  const { user, profile, loading } = useAuth();

  // Loading state
  if (loading) {
    return <LoadingScreen />;
  }

  // Not authenticated → redirect to home
  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  // Wrong role → redirect to appropriate dashboard
  if (requiredRole && profile.role !== requiredRole) {
    const redirectPath = profile.role === UserRole.Teacher 
      ? '/teacher/dashboard' 
      : '/student/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // All checks passed → render children
  return <>{children}</>;
});

export default ProtectedRoute;

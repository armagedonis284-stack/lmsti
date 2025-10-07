import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/SimpleAuthContext';
import LoadingScreen from './ui/LoadingScreen';

export enum UserRole {
  Teacher = 'teacher',
  Student = 'student'
}

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, profile, loading, isAuthenticated } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user || !profile) {
    return <Navigate to="/" replace />;
  }

  // Check role if required
  if (requiredRole && profile.role !== requiredRole) {
    const redirectPath = profile.role === UserRole.Teacher 
      ? '/teacher/dashboard' 
      : '/student/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // All checks passed - render children
  return <>{children}</>;
};

export default SimpleProtectedRoute;

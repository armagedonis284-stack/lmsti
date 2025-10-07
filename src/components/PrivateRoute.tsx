/**
 * PrivateRoute Component
 * 
 * A higher-order component that protects routes requiring authentication.
 * Handles role-based access control and redirects.
 */

import React, { memo, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from './ui/LoadingScreen';
import { storeRedirectPath } from '../utils/authStorage';

export enum UserRole {
  Teacher = 'teacher',
  Student = 'student',
}

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallbackPath?: string;
}

/**
 * PrivateRoute - Protects routes that require authentication
 * 
 * @param children - The component to render if authenticated
 * @param requiredRole - Optional role requirement (teacher/student)
 * @param fallbackPath - Custom fallback path (defaults to home)
 * 
 * @example
 * ```tsx
 * <PrivateRoute requiredRole={UserRole.Teacher}>
 *   <TeacherDashboard />
 * </PrivateRoute>
 * ```
 */
const PrivateRoute: React.FC<PrivateRouteProps> = memo(({ 
  children, 
  requiredRole, 
  fallbackPath = '/' 
}) => {
  const { user, profile, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Store the attempted path for redirect after login
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/') {
      storeRedirectPath(location.pathname);
    }
  }, [isAuthenticated, location.pathname]);

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user || !profile) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check role requirement
  if (requiredRole && profile.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user's actual role
    const redirectPath = profile.role === UserRole.Teacher 
      ? '/teacher/dashboard' 
      : '/student/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // All checks passed - render the protected component
  return <>{children}</>;
});

PrivateRoute.displayName = 'PrivateRoute';

export default PrivateRoute;

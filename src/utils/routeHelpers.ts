/**
 * Route Helper Functions
 * 
 * Utility functions for route management, navigation,
 * and URL handling.
 */

import { UserRole } from '../components/PrivateRoute';

export interface RouteConfig {
  path: string;
  requiresAuth: boolean;
  requiredRole?: UserRole;
  title?: string;
  description?: string;
}

/**
 * Route configurations for the application
 */
export const ROUTES: Record<string, RouteConfig> = {
  HOME: {
    path: '/',
    requiresAuth: false,
    title: 'Home'
  },
  LOGIN: {
    path: '/login',
    requiresAuth: false,
    title: 'Login'
  },
  TEACHER_DASHBOARD: {
    path: '/teacher/dashboard',
    requiresAuth: true,
    requiredRole: UserRole.Teacher,
    title: 'Teacher Dashboard'
  },
  TEACHER_CLASSES: {
    path: '/teacher/classes',
    requiresAuth: true,
    requiredRole: UserRole.Teacher,
    title: 'Manage Classes'
  },
  TEACHER_CONTENT: {
    path: '/teacher/content',
    requiresAuth: true,
    requiredRole: UserRole.Teacher,
    title: 'Manage Content'
  },
  STUDENT_DASHBOARD: {
    path: '/student/dashboard',
    requiresAuth: true,
    requiredRole: UserRole.Student,
    title: 'Student Dashboard'
  },
  STUDENT_PROFILE: {
    path: '/student/profile',
    requiresAuth: true,
    requiredRole: UserRole.Student,
    title: 'Student Profile'
  },
  STUDENT_ASSIGNMENTS: {
    path: '/student/assignments',
    requiresAuth: true,
    requiredRole: UserRole.Student,
    title: 'Assignments'
  }
};

/**
 * Gets route configuration by path
 */
export const getRouteConfig = (path: string): RouteConfig | null => {
  return Object.values(ROUTES).find(route => route.path === path) || null;
};

/**
 * Checks if a route requires authentication
 */
export const requiresAuth = (path: string): boolean => {
  const config = getRouteConfig(path);
  return config?.requiresAuth || false;
};

/**
 * Gets required role for a route
 */
export const getRequiredRole = (path: string): UserRole | null => {
  const config = getRouteConfig(path);
  return config?.requiredRole || null;
};

/**
 * Gets page title for a route
 */
export const getPageTitle = (path: string): string => {
  const config = getRouteConfig(path);
  return config?.title || 'ClassRoom';
};

/**
 * Checks if user can access a route
 */
export const canAccessRoute = (
  path: string, 
  userRole: UserRole | null, 
  isAuthenticated: boolean
): boolean => {
  const config = getRouteConfig(path);
  
  if (!config) return false;
  
  // Check authentication requirement
  if (config.requiresAuth && !isAuthenticated) {
    return false;
  }
  
  // Check role requirement
  if (config.requiredRole && userRole !== config.requiredRole) {
    return false;
  }
  
  return true;
};

/**
 * Gets redirect path for unauthorized access
 */
export const getUnauthorizedRedirect = (userRole: UserRole | null): string => {
  if (!userRole) return '/';
  
  return userRole === UserRole.Teacher 
    ? ROUTES.TEACHER_DASHBOARD.path 
    : ROUTES.STUDENT_DASHBOARD.path;
};

/**
 * Builds URL with query parameters
 */
export const buildUrl = (path: string, params?: Record<string, string>): string => {
  if (!params || Object.keys(params).length === 0) {
    return path;
  }
  
  const searchParams = new URLSearchParams(params);
  return `${path}?${searchParams.toString()}`;
};

/**
 * Parses query parameters from URL
 */
export const parseQueryParams = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
};

/**
 * Gets current path without query parameters
 */
export const getPathWithoutQuery = (pathname: string): string => {
  return pathname.split('?')[0];
};

/**
 * Checks if current path matches a route pattern
 */
export const matchesRoute = (currentPath: string, targetPath: string): boolean => {
  // Exact match
  if (currentPath === targetPath) return true;
  
  // Pattern match for dynamic routes
  const currentSegments = currentPath.split('/');
  const targetSegments = targetPath.split('/');
  
  if (currentSegments.length !== targetSegments.length) return false;
  
  return currentSegments.every((segment, index) => {
    const targetSegment = targetSegments[index];
    // Match dynamic segments (starting with :)
    return targetSegment.startsWith(':') || segment === targetSegment;
  });
};

/**
 * Gets breadcrumb data for a route
 */
export const getBreadcrumbs = (path: string): Array<{ label: string; path: string }> => {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; path: string }> = [];
  
  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip dynamic segments for breadcrumb labels
    if (segment.startsWith(':')) return;
    
    const config = getRouteConfig(currentPath);
    const label = config?.title || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    breadcrumbs.push({
      label,
      path: currentPath
    });
  });
  
  return breadcrumbs;
};

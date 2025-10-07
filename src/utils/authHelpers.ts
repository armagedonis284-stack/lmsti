/**
 * Authentication Helper Functions
 * 
 * Utility functions for authentication-related operations,
 * validation, and user management.
 */

import { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'teacher' | 'student';
}

export interface StudentAuthData {
  id: string;
  student_id: string;
  email: string;
  full_name: string;
  birth_date: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_by: string;
}

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 */
export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }
  
  return { valid: true };
};

/**
 * Creates a mock user object for students (who don't use Supabase Auth)
 */
export const createMockUser = (studentData: StudentAuthData): User => {
  return {
    id: studentData.id,
    email: studentData.email,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: []
  } as User;
};

/**
 * Determines user role from profile data
 */
export const getUserRole = (profile: AuthUser | null): 'teacher' | 'student' | null => {
  return profile?.role || null;
};

/**
 * Checks if user is authenticated
 */
export const isUserAuthenticated = (user: User | null, profile: AuthUser | null): boolean => {
  return !!(user && profile);
};

/**
 * Checks if user has specific role
 */
export const hasRole = (profile: AuthUser | null, role: 'teacher' | 'student'): boolean => {
  return profile?.role === role;
};

/**
 * Gets appropriate dashboard path for user role
 */
export const getDashboardPath = (role: 'teacher' | 'student'): string => {
  return role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
};

/**
 * Sanitizes user input for security
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Formats user display name
 */
export const formatDisplayName = (fullName: string): string => {
  return sanitizeInput(fullName) || 'Unknown User';
};

/**
 * Generates a secure session ID
 */
export const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}-${random}`;
};

/**
 * Validates session data
 */
export const isValidSession = (sessionData: any): boolean => {
  return !!(
    sessionData &&
    sessionData.id &&
    sessionData.email &&
    sessionData.full_name &&
    sessionData.is_active !== undefined
  );
};

/**
 * Creates error message for authentication failures
 */
export const createAuthError = (message: string, code?: string) => {
  return {
    message,
    code: code || 'AUTH_ERROR',
    timestamp: new Date().toISOString()
  };
};

/**
 * Logs authentication events for debugging
 */
export const logAuthEvent = (event: string, data?: any) => {
  console.log(`[AUTH] ${event}`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

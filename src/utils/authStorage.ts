/**
 * Authentication Storage Utilities
 * 
 * Centralized storage management for authentication tokens and session data.
 * Handles both localStorage and sessionStorage with mobile compatibility.
 */

import { safeLocalStorage, handleMobileError } from './mobile';

export interface AuthStorageKeys {
  STUDENT_SESSION: string;
  TEACHER_SESSION: string;
  REDIRECT_PATH: string;
  AUTH_STATE: string;
}

export const AUTH_STORAGE_KEYS: AuthStorageKeys = {
  STUDENT_SESSION: 'student_session',
  TEACHER_SESSION: 'teacher_session', 
  REDIRECT_PATH: 'auth_redirect_path',
  AUTH_STATE: 'auth_state'
};

/**
 * Clear all authentication-related storage
 */
export const clearAuthStorage = (): void => {
  try {
    // Clear localStorage
    Object.values(AUTH_STORAGE_KEYS).forEach(key => {
      safeLocalStorage.removeItem(key);
    });

    // Clear sessionStorage
    Object.values(AUTH_STORAGE_KEYS).forEach(key => {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    });

    // Clear any other auth-related keys that might exist
    const authKeys = [
      'sb-', // Supabase keys
      'supabase.',
      'auth.',
      'user_',
      'session_'
    ];

    if (typeof window !== 'undefined' && window.localStorage) {
      const allKeys = Object.keys(window.localStorage);
      allKeys.forEach(key => {
        if (authKeys.some(authKey => key.startsWith(authKey))) {
          window.localStorage.removeItem(key);
        }
      });
    }

    console.log('All authentication storage cleared');
  } catch (error) {
    console.error('Error clearing auth storage:', error);
    handleMobileError(error, 'clearAuthStorage');
  }
};

/**
 * Store student session data
 */
export const storeStudentSession = (sessionData: any): void => {
  try {
    safeLocalStorage.setItem(AUTH_STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Error storing student session:', error);
    handleMobileError(error, 'storeStudentSession');
  }
};

/**
 * Retrieve student session data
 */
export const getStudentSession = (): any | null => {
  try {
    const sessionData = safeLocalStorage.getItem(AUTH_STORAGE_KEYS.STUDENT_SESSION);
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (error) {
    console.error('Error retrieving student session:', error);
    handleMobileError(error, 'getStudentSession');
    return null;
  }
};

/**
 * Store redirect path for after login
 */
export const storeRedirectPath = (path: string): void => {
  try {
    safeLocalStorage.setItem(AUTH_STORAGE_KEYS.REDIRECT_PATH, path);
  } catch (error) {
    console.error('Error storing redirect path:', error);
    handleMobileError(error, 'storeRedirectPath');
  }
};

/**
 * Get and clear redirect path
 */
export const getAndClearRedirectPath = (): string | null => {
  try {
    const path = safeLocalStorage.getItem(AUTH_STORAGE_KEYS.REDIRECT_PATH);
    if (path) {
      safeLocalStorage.removeItem(AUTH_STORAGE_KEYS.REDIRECT_PATH);
    }
    return path;
  } catch (error) {
    console.error('Error getting redirect path:', error);
    handleMobileError(error, 'getAndClearRedirectPath');
    return null;
  }
};

/**
 * Store auth state for debugging/monitoring
 */
export const storeAuthState = (state: any): void => {
  try {
    safeLocalStorage.setItem(AUTH_STORAGE_KEYS.AUTH_STATE, JSON.stringify({
      ...state,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error storing auth state:', error);
    handleMobileError(error, 'storeAuthState');
  }
};

/**
 * Get auth state
 */
export const getAuthState = (): any | null => {
  try {
    const state = safeLocalStorage.getItem(AUTH_STORAGE_KEYS.AUTH_STATE);
    return state ? JSON.parse(state) : null;
  } catch (error) {
    console.error('Error getting auth state:', error);
    handleMobileError(error, 'getAuthState');
    return null;
  }
};

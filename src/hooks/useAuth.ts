/**
 * useAuth Hook
 * 
 * Custom hook that provides authentication state and methods.
 * This is a cleaner interface to the AuthContext.
 */

import { useAuth as useAuthContext } from '../contexts/AuthContext';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'teacher' | 'student';
}

export interface AuthState {
  user: AuthUser | null;
  profile: AuthUser | null;
  studentAuth: any | null;
  studentProfile: any | null;
  session: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

export interface AuthMethods {
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  studentSignIn: (email: string, password: string) => Promise<{ error?: any }>;
  studentForgotPassword: (email: string) => Promise<{ error?: any }>;
  studentResetPassword: (token: string, newPassword: string) => Promise<{ error?: any }>;
  updateStudentProfile: (data: any) => Promise<{ error?: any }>;
  createStudent: (data: any) => Promise<{ error?: any; data?: any }>;
  getStudents: () => Promise<{ error?: any; data?: any[] }>;
  updateStudent: (studentId: string, data: any) => Promise<{ error?: any }>;
  deleteStudent: (studentId: string) => Promise<{ error?: any }>;
  resetStudentPassword: (studentId: string) => Promise<{ error?: any; newPassword?: string }>;
  signOut: () => Promise<void>;
}

/**
 * Custom hook for authentication
 * 
 * @returns {AuthState & AuthMethods} Authentication state and methods
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, signOut } = useAuth();
 * 
 * if (!isAuthenticated) {
 *   return <LoginForm />;
 * }
 * 
 * return (
 *   <div>
 *     <p>Welcome, {user?.full_name}!</p>
 *     <button onClick={signOut}>Logout</button>
 *   </div>
 * );
 * ```
 */
export const useAuth = (): AuthState & AuthMethods => {
  const authContext = useAuthContext();
  
  const isAuthenticated = !!(authContext.user && authContext.profile);
  const isTeacher = authContext.profile?.role === 'teacher';
  const isStudent = authContext.profile?.role === 'student';
  
  return {
    ...authContext,
    isAuthenticated,
    isTeacher,
    isStudent
  };
};

export default useAuth;

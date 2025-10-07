/**
 * Simplified Authentication Context
 * 
 * Features:
 * - Lightweight and fast
 * - Better error handling
 * - Clear user feedback
 * - Optimized for mobile
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { verifyPassword } from '../utils/auth';
import { safeLocalStorage } from '../utils/mobile';

// Simplified interfaces
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'teacher' | 'student';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; userType?: 'teacher' | 'student' }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Simple Auth Provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Simple user type check
  const checkUserType = useCallback(async (userId: string, email: string): Promise<UserProfile | null> => {
    try {
      // Check teachers first
      const { data: teacherData, error: teacherError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();

      if (teacherData && !teacherError) {
        return {
          id: teacherData.id,
          email: teacherData.email,
          full_name: teacherData.full_name,
          role: 'teacher'
        };
      }

      // Check students
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, email, full_name')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (studentData && !studentError) {
        return {
          id: studentData.id,
          email: studentData.email,
          full_name: studentData.full_name,
          role: 'student'
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking user type:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) setLoading(false);
          return;
        }

        if (session?.user) {
          const userProfile = await checkUserType(session.user.id, session.user.email!);
          if (mounted && userProfile) {
            setUser(session.user);
            setProfile(userProfile);
          }
        }

        if (mounted) setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (!mounted) return;

        if (session?.user) {
          const userProfile = await checkUserType(session.user.id, session.user.email!);
          if (userProfile) {
            setUser(session.user);
            setProfile(userProfile);
          } else {
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkUserType]);

  // Simplified sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);

      // Try teacher login first
      const { data: teacherData, error: teacherError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (teacherData.user && !teacherError) {
        const userProfile = await checkUserType(teacherData.user.id, teacherData.user.email!);
        if (userProfile) {
          setUser(teacherData.user);
          setProfile(userProfile);
          setLoading(false);
          return { success: true, userType: 'teacher' as const };
        }
      }

      // Try student login
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (studentError || !studentData) {
        setLoading(false);
        return { success: false, error: 'Email tidak ditemukan atau akun tidak aktif' };
      }

      const isValidPassword = await verifyPassword(password, studentData.password);
      if (!isValidPassword) {
        setLoading(false);
        return { success: false, error: 'Password salah' };
      }

      // Create mock user for students
      const mockUser = { id: studentData.id, email: studentData.email } as User;
      const userProfile: UserProfile = {
        id: studentData.id,
        email: studentData.email,
        full_name: studentData.full_name,
        role: 'student'
      };

      setUser(mockUser);
      setProfile(userProfile);
      
      // Store student session
      safeLocalStorage.setItem('student_session', JSON.stringify(studentData));
      
      setLoading(false);
      return { success: true, userType: 'student' as const };

    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      return { success: false, error: 'Terjadi kesalahan saat login' };
    }
  }, [checkUserType]);

  // Simple sign out
  const signOut = useCallback(async () => {
    try {
      // Clear student session
      safeLocalStorage.removeItem('student_session');
      
      // Clear state
      setUser(null);
      setProfile(null);
      
      // Sign out from Supabase if it's a teacher
      if (user && profile?.role === 'teacher') {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [user, profile]);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user && !!profile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

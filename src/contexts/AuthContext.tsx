/**
 * Authentication Context
 *
 * ARCHITECTURE:
 * - TEACHERS: Use Supabase Auth (auth.users) + users table
 * - STUDENTS: Use students table only (no Supabase Auth)
 *
 * LOGIN FLOW:
 * 1. Teacher login: Uses supabase.auth.signInWithPassword() → determines role from users table
 * 2. Student login: Direct email/password check against students table → manual state management
 *
 * No role ambiguity - user type determined solely by which table they exist in.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { hashPassword, verifyPassword, generatePasswordFromBirthDate } from '../utils/auth';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'teacher' | 'student';
}

interface StudentAuthData {
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

interface StudentProfile {
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

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  studentAuth: StudentAuthData | null;
  studentProfile: StudentProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  studentSignIn: (email: string, password: string) => Promise<{ error?: any }>;
  studentForgotPassword: (email: string) => Promise<{ error?: any }>;
  studentResetPassword: (token: string, newPassword: string) => Promise<{ error?: any }>;
  updateStudentProfile: (data: Partial<StudentProfile & { email: string; password?: string }>) => Promise<{ error?: any }>;
  createStudent: (data: { full_name: string; birth_date: string; phone?: string; address?: string }) => Promise<{ error?: any; data?: any }>;
  getStudents: () => Promise<{ error?: any; data?: any[] }>;
  updateStudent: (studentId: string, data: Partial<StudentProfile>) => Promise<{ error?: any }>;
  deleteStudent: (studentId: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [studentAuth, setStudentAuth] = useState<StudentAuthData | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  };

  // Helper function to determine user type - simplified logic
  // Teachers: Exist in Supabase auth (users table)
  // Students: Exist in students table only (no Supabase auth)
  const determineUserType = async (userId: string, email: string) => {
    try {
      // First priority: Check if user exists in users table (teachers from Supabase auth)
      const { data: userData, error: userError } = await Promise.race([
        supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('User check timeout')), 5000)
        )
      ]) as any;

      if (userData && !userError) {
        return { type: 'teacher', profile: userData };
      }

      // Second priority: Check if email exists in students table (students created by teachers)
      const { data: studentData, error: studentError } = await Promise.race([
        supabase
          .from('students')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Student check timeout')), 5000)
        )
      ]) as any;

      if (studentData && !studentError) {
        return { type: 'student', profile: studentData };
      }

      // If no data found in either table, return null
      console.warn('User not found in users or students table:', { userId, email });
      return { type: null, profile: null };
    } catch (error) {
      console.error('Error in determineUserType:', error);
      return { type: null, profile: null };
    }
  };

  useEffect(() => {
    let isMounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isMounted) {
            setProfile(null);
            setStudentAuth(null);
            setStudentProfile(null);
            setLoading(false);
          }
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Add timeout to prevent infinite loading (longer timeout)
          const timeoutId = setTimeout(() => {
            if (isMounted) {
              console.warn('Authentication check timeout - but session might still be valid');
              // Don't clear states if we have a valid session
              if (!session?.user) {
                setProfile(null);
                setStudentAuth(null);
                setStudentProfile(null);
              }
              setLoading(false);
            }
          }, 10000);

          try {
            const userType = await determineUserType(session.user.id, session.user.email!);

            clearTimeout(timeoutId);

            if (!isMounted) return;

            if (userType.type === 'teacher' && userType.profile) {
              setProfile({
                id: userType.profile.id,
                email: userType.profile.email,
                full_name: userType.profile.full_name,
                role: 'teacher'
              });
              setStudentAuth(null);
              setStudentProfile(null);
            } else if (userType.type === 'student' && userType.profile) {
              setProfile({
                id: userType.profile.id,
                email: userType.profile.email,
                full_name: userType.profile.full_name,
                role: 'student'
              });
              setStudentAuth(userType.profile);
              setStudentProfile(userType.profile);
            } else {
              // User not found in either table, clear all states
              console.warn('User not found in database tables');
              setProfile(null);
              setStudentAuth(null);
              setStudentProfile(null);
            }
          } catch (userTypeError) {
            clearTimeout(timeoutId);
            console.error('Error determining user type:', userTypeError);
            if (isMounted) {
              setProfile(null);
              setStudentAuth(null);
              setStudentProfile(null);
            }
          }
        } else {
          setProfile(null);
          setStudentAuth(null);
          setStudentProfile(null);
        }
      } catch (error) {
        console.error('Error in getSession:', error);
        // Clear all states on error
        if (isMounted) {
          setProfile(null);
          setStudentAuth(null);
          setStudentProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        try {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            // Add timeout for auth state changes (longer timeout)
            const timeoutId = setTimeout(() => {
              if (isMounted) {
                console.warn('Auth state change timeout - but user might still be valid');
                // Don't clear states if we have a valid session
                if (!session?.user) {
                  setProfile(null);
                  setStudentAuth(null);
                  setStudentProfile(null);
                }
                setLoading(false);
              }
            }, 8000);

            try {
              const userType = await determineUserType(session.user.id, session.user.email!);

              clearTimeout(timeoutId);

              if (!isMounted) return;

              if (userType.type === 'teacher' && userType.profile) {
                setProfile({
                  id: userType.profile.id,
                  email: userType.profile.email,
                  full_name: userType.profile.full_name,
                  role: 'teacher'
                });
                setStudentAuth(null);
                setStudentProfile(null);
              } else if (userType.type === 'student' && userType.profile) {
                setProfile({
                  id: userType.profile.id,
                  email: userType.profile.email,
                  full_name: userType.profile.full_name,
                  role: 'student'
                });
                setStudentAuth(userType.profile);
                setStudentProfile(userType.profile);
              } else {
                // User not found in either table, clear all states
                console.warn('User not found during auth state change');
                setProfile(null);
                setStudentAuth(null);
                setStudentProfile(null);
              }
            } catch (userTypeError) {
              clearTimeout(timeoutId);
              console.error('Error determining user type in auth state change:', userTypeError);
              if (isMounted) {
                setProfile(null);
                setStudentAuth(null);
                setStudentProfile(null);
              }
            }
          } else {
            setProfile(null);
            setStudentAuth(null);
            setStudentProfile(null);
          }
        } catch (error) {
          console.error('Error in onAuthStateChange:', error);
          // Clear all states on error
          if (isMounted) {
            setProfile(null);
            setStudentAuth(null);
            setStudentProfile(null);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Teacher login using Supabase Auth
    // Only users who exist in auth.users (and users table) can login this way
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const studentSignIn = async (email: string, password: string) => {
    let isMounted = true;
    try {
      setLoading(true);

      // Add timeout for student sign in (longer timeout)
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
          console.warn('Student sign in timeout');
        }
      }, 15000);

      // Students login directly from students table (no Supabase auth)
      // This is separate from teacher login which uses Supabase auth
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      clearTimeout(timeoutId);

      if (studentError || !studentData) {
        return { error: { message: 'Email tidak ditemukan atau akun tidak aktif' } };
      }

      // Verify password with timeout
      const isValidPassword = await Promise.race([
        verifyPassword(password, studentData.password),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Password verification timeout')), 5000)
        )
      ]);

      if (!isValidPassword) {
        return { error: { message: 'Password salah' } };
      }

      // Set auth state manually for students (no Supabase session)
      setStudentAuth(studentData);
      setStudentProfile(studentData);
      setProfile({
        id: studentData.id,
        email: studentData.email,
        full_name: studentData.full_name,
        role: 'student'
      });
      setUser({ id: studentData.id } as User); // Mock user object for students
      setSession(null); // Students don't use Supabase sessions

      return { error: null };
    } catch (error) {
      console.error('Error in studentSignIn:', error);
      return { error: { message: error instanceof Error ? error.message : 'Terjadi kesalahan saat login' } };
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const studentForgotPassword = async (email: string) => {
    try {
      // Get student data with birth date
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (studentError || !studentData) {
        return { error: { message: 'Email tidak ditemukan' } };
      }

      // Generate new password from birth date
      const newPassword = generatePasswordFromBirthDate(studentData.birth_date);
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      const { error: updateError } = await supabase
        .from('students')
        .update({ password: hashedPassword })
        .eq('email', email);

      if (updateError) throw updateError;

      // In a real app, you would send an email here
      // For now, we'll just return success
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const studentResetPassword = async (token: string, newPassword: string) => {
    try {
      const hashedPassword = await hashPassword(newPassword);

      // For now, we'll implement a simple password reset
      // In production, you'd want a proper token-based system
      return { error: { message: 'Password reset not implemented in new schema' } };
    } catch (error) {
      return { error };
    }
  };

  const updateStudentProfile = async (data: Partial<StudentProfile & { email: string; password?: string }>) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    try {
      // Update student data in students table
      const updateData: any = {};
      if (data.email) updateData.email = data.email;
      if (data.full_name) updateData.full_name = data.full_name;
      if (data.birth_date) updateData.birth_date = data.birth_date;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.password) updateData.password = await hashPassword(data.password);
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh data for student
      const { data: studentData, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!fetchError && studentData) {
        setStudentAuth(studentData);
        setStudentProfile(studentData);
        setProfile({
          id: studentData.id,
          email: studentData.email,
          full_name: studentData.full_name,
          role: 'student'
        });
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };


  const createStudent = async (data: { full_name: string; birth_date: string; phone?: string; address?: string }) => {
    try {
      if (!user || !profile) {
        return { error: { message: 'Authentication required' } };
      }

      // Check if user is a teacher (exists in users table)
      const { data: teacherData } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!teacherData) {
        return { error: { message: 'Only teachers can create student accounts' } };
      }

      // Generate student ID and email
      const { data: studentIdResult, error: idError } = await supabase
        .rpc('generate_student_id');

      if (idError) throw idError;

      const { data: emailResult, error: emailError } = await supabase
        .rpc('generate_student_email', { student_name: data.full_name });

      if (emailError) throw emailError;

      // Generate password from birth date
      const defaultPassword = generatePasswordFromBirthDate(data.birth_date);
      const hashedPassword = await hashPassword(defaultPassword);

      // Create student record
      const { data: studentData, error: createError } = await supabase
        .from('students')
        .insert({
          student_id: studentIdResult,
          email: emailResult,
          password: hashedPassword,
          full_name: data.full_name,
          birth_date: data.birth_date,
          phone: data.phone,
          address: data.address,
          created_by: user.id
        })
        .select()
        .single();

      if (createError) throw createError;

      return { error: null, data: studentData };
    } catch (error) {
      return { error };
    }
  };

  const getStudents = async () => {
    try {
      if (!user || !profile) {
        return { error: { message: 'Authentication required' } };
      }

      // Check if user is a teacher
      const { data: teacherData } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!teacherData) {
        return { error: { message: 'Only teachers can view student accounts' } };
      }

      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { error: null, data: students };
    } catch (error) {
      return { error };
    }
  };

  const updateStudent = async (studentId: string, data: Partial<StudentProfile>) => {
    try {
      if (!user || !profile) {
        return { error: { message: 'Authentication required' } };
      }

      // Check if user is a teacher
      const { data: teacherData } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!teacherData) {
        return { error: { message: 'Only teachers can update student accounts' } };
      }

      const updateData: any = {};
      if (data.full_name) updateData.full_name = data.full_name;
      if (data.birth_date) updateData.birth_date = data.birth_date;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', studentId)
        .eq('created_by', user.id); // Ensure teacher can only update their own students

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const deleteStudent = async (studentId: string) => {
    try {
      if (!user || !profile) {
        return { error: { message: 'Authentication required' } };
      }

      // Check if user is a teacher
      const { data: teacherData } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!teacherData) {
        return { error: { message: 'Only teachers can delete student accounts' } };
      }

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('created_by', user.id); // Ensure teacher can only delete their own students

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    // Check if user is a teacher (exists in users table)
    if (user && profile) {
      const { data: teacherData } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (teacherData) {
        // Teacher logout - use Supabase Auth
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } else {
        // Student logout - manual logout
        setUser(null);
        setProfile(null);
        setStudentAuth(null);
        setStudentProfile(null);
        setSession(null);
      }
    } else {
      // Fallback - manual logout
      setUser(null);
      setProfile(null);
      setStudentAuth(null);
      setStudentProfile(null);
      setSession(null);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    studentAuth,
    studentProfile,
    session,
    loading,
    signIn,
    studentSignIn,
    studentForgotPassword,
    studentResetPassword,
    updateStudentProfile,
    createStudent,
    getStudents,
    updateStudent,
    deleteStudent,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
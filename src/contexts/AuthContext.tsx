/**
 * Simplified Authentication Context
 *
 * UNIFIED ARCHITECTURE:
 * - Teachers: Supabase Auth + users table
 * - Students: students table only (no Supabase Auth)
 * - Simplified for better mobile compatibility
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { hashPassword, verifyPassword, generatePasswordFromBirthDate } from '../utils/auth';
import { safeLocalStorage, handleMobileError } from '../utils/mobile';

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
  resetStudentPassword: (studentId: string) => Promise<{ error?: any; newPassword?: string }>;
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

// Optimized Auth Provider with minimal queries and fast loading
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [studentAuth, setStudentAuth] = useState<StudentAuthData | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Simplified user type determination
  const determineUserType = useCallback(async (userId: string, email: string) => {
    try {
      console.log('Determining user type for:', { userId, email });
      
      // Check users table first (teachers)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();

      if (userData && !userError) {
        return { type: 'teacher' as const, profile: userData };
      }

      // If not a teacher, check students table
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, email, full_name, birth_date, phone, address, is_active, created_by')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (studentData && !studentError) {
        return { type: 'student' as const, profile: studentData };
      }

      // User not found in either table
      console.warn('User not found in database tables');
      return { type: null, profile: null };
    } catch (error) {
      console.error('Error in determineUserType:', error);
      return { type: null, profile: null };
    }
  }, []);

  // Optimized state update function
  const updateAuthState = useCallback((userType: { type: 'teacher' | 'student' | null; profile: any }) => {
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
      setProfile(null);
      setStudentAuth(null);
      setStudentProfile(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Check for student session first (faster)
        const studentSession = safeLocalStorage.getItem('student_session');

        if (studentSession) {
          try {
            const studentData = JSON.parse(studentSession);
            
            // Quick verification
            const { data: verifiedStudent, error: verifyError } = await supabase
              .from('students')
              .select('*')
              .eq('id', studentData.id)
              .eq('email', studentData.email)
              .eq('is_active', true)
              .single();

            if (!verifyError && verifiedStudent && isMounted) {
              console.log('Student session restored');
              setUser({ id: verifiedStudent.id, email: verifiedStudent.email } as User);
              updateAuthState({ type: 'student', profile: verifiedStudent });
              setSession(null);
              setLoading(false);
              return;
            } else {
              console.log('Invalid student session, clearing...');
              safeLocalStorage.removeItem('student_session');
            }
          } catch (e) {
            console.error('Error parsing student session:', e);
            handleMobileError(e, 'student session parsing');
            safeLocalStorage.removeItem('student_session');
          }
        }

        // Check Supabase session for teachers
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userType = await determineUserType(session.user.id, session.user.email!);
          
          if (!isMounted) return;

          updateAuthState(userType);

          // Store student session if needed
          if (userType.type === 'student' && userType.profile) {
            safeLocalStorage.setItem('student_session', JSON.stringify(userType.profile));
          }
        } else {
          updateAuthState({ type: null, profile: null });
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        try {
          console.log('Auth state change:', event, { hasSession: !!session });

          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            const userType = await determineUserType(session.user.id, session.user.email!);
            
            if (!isMounted) return;

            updateAuthState(userType);

            // Store student session if needed
            if (userType.type === 'student' && userType.profile) {
              safeLocalStorage.setItem('student_session', JSON.stringify(userType.profile));
            }
          } else {
            updateAuthState({ type: null, profile: null });
          }

          if (isMounted) {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error in onAuthStateChange:', error);
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
    console.log('Attempting teacher login for:', email);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('Teacher login failed:', error.message);
      return { error };
    }

    console.log('Teacher login successful');
    return { error: null };
  };

  const studentSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting student login for:', email);

      // Students login directly from students table (no Supabase auth)
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (studentError || !studentData) {
        console.log('Student not found or inactive:', studentError);
        setLoading(false);
        return { error: { message: 'Email tidak ditemukan atau akun tidak aktif' } };
      }

      // Password verification
      const isValidPassword = await verifyPassword(password, studentData.password);

      if (!isValidPassword) {
        console.log('Password verification failed');
        setLoading(false);
        return { error: { message: 'Password salah' } };
      }

      // Set auth state for students
      const mockUser = {
        id: studentData.id,
        email: studentData.email
      } as User;

      setUser(mockUser);
      setSession(null);
      updateAuthState({ type: 'student', profile: studentData });

      // Store session for persistence
      safeLocalStorage.setItem('student_session', JSON.stringify(studentData));

      setLoading(false);
      return { error: null };
    } catch (error) {
      console.error('Error in studentSignIn:', error);
      handleMobileError(error, 'studentSignIn');
      setLoading(false);
      return { error: { message: error instanceof Error ? error.message : 'Terjadi kesalahan saat login' } };
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

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const studentResetPassword = async (_token: string, _newPassword: string) => {
    try {
      // For now, we'll implement a simple password reset
      // In production, you'd want a proper token-based system
      return { error: { message: 'Password reset not implemented in new schema' } };
    } catch (error) {
      return { error };
    }
  };

  const updateStudentProfile = async (data: Partial<StudentProfile & { email: string; password?: string }>) => {
    if (!user || !studentProfile) return { error: { message: 'Not authenticated' } };

    try {
      console.log('Updating student profile:', { userId: user.id, data });
      
      // Update student data in students table
      const updateData: any = {};
      if (data.email) updateData.email = data.email;
      if (data.full_name) updateData.full_name = data.full_name;
      if (data.birth_date) updateData.birth_date = data.birth_date;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.password) updateData.password = await hashPassword(data.password);
      updateData.updated_at = new Date().toISOString();

      console.log('Update data to send:', updateData);

      // Use the student's current email to identify the record
      // This works around RLS issues since students don't use Supabase Auth
      const { error: updateError } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', user.id)
        .eq('email', studentProfile.email); // Additional security check

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Update successful');

      // Refresh data for student
      const { data: studentData, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Fetch updated data:', { studentData, fetchError });

      if (!fetchError && studentData) {
        console.log('Updating state with new data');
        
        // Update all state with new data
        setStudentAuth(studentData);
        setStudentProfile(studentData);

        // Update profile with new email
        setProfile({
          id: studentData.id,
          email: studentData.email,
          full_name: studentData.full_name,
          role: 'student'
        });

        // Update mock user object with new email for future authentications
        const updatedMockUser = {
          id: studentData.id,
          email: studentData.email
        } as User;

        setUser(updatedMockUser);

        // Update localStorage with new email for persistence
        localStorage.setItem('student_session', JSON.stringify(studentData));
        
        console.log('State updated successfully');
      } else {
        console.error('Failed to fetch updated data:', fetchError);
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

  const resetStudentPassword = async (studentId: string) => {
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
        return { error: { message: 'Only teachers can reset student passwords' } };
      }

      // Get student data to access birth date
      const { data: studentData, error: fetchError } = await supabase
        .from('students')
        .select('birth_date, student_id, full_name')
        .eq('id', studentId)
        .eq('created_by', user.id) // Ensure teacher can only reset their own students' passwords
        .single();

      if (fetchError || !studentData) {
        return { error: { message: 'Student not found or access denied' } };
      }

      // Generate new password from birth date
      const newPassword = generatePasswordFromBirthDate(studentData.birth_date);
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      const { error: updateError } = await supabase
        .from('students')
        .update({ password: hashedPassword })
        .eq('id', studentId);

      if (updateError) throw updateError;

      return { error: null, newPassword };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clear student session with mobile error handling
      safeLocalStorage.removeItem('student_session');
      
      // Clear all auth state
      setUser(null);
      setProfile(null);
      setStudentAuth(null);
      setStudentProfile(null);
      setSession(null);

      // If it's a teacher session, also sign out from Supabase
      if (session) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Error during sign out:', error);
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
    resetStudentPassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

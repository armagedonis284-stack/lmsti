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
  email: string;
  student_id: string;
  is_active: boolean;
}

interface StudentProfile {
  id: string;
  student_id: string;
  birth_date: string;
  phone: string | null;
  address: string | null;
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

  const fetchStudentAuth = async (studentId: string) => {
    const { data, error } = await supabase
      .from('student_auth')
      .select('*')
      .eq('student_id', studentId)
      .single();
    
    if (error) {
      console.error('Error fetching student auth:', error);
      return null;
    }
    
    return data;
  };

  const fetchStudentProfile = async (studentId: string) => {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('student_id', studentId)
      .single();
    
    if (error) {
      console.error('Error fetching student profile:', error);
      return null;
    }
    
    return data;
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setProfile(userProfile);
        
        if (userProfile?.role === 'student') {
          const studentAuthData = await fetchStudentAuth(session.user.id);
          setStudentAuth(studentAuthData);
          const studentProfileData = await fetchStudentProfile(session.user.id);
          setStudentProfile(studentProfileData);
        }
      }
      
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id);
          setProfile(userProfile);
          
          if (userProfile?.role === 'student') {
            const studentAuthData = await fetchStudentAuth(session.user.id);
            setStudentAuth(studentAuthData);
            const studentProfileData = await fetchStudentProfile(session.user.id);
            setStudentProfile(studentProfileData);
          }
        } else {
          setProfile(null);
          setStudentAuth(null);
          setStudentProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const studentSignIn = async (email: string, password: string) => {
    try {
      // Get student auth data
      const { data: studentAuthData, error: authError } = await supabase
        .from('student_auth')
        .select(`
          *,
          users (*),
          student_profiles (*)
        `)
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (authError || !studentAuthData) {
        return { error: { message: 'Email tidak ditemukan atau akun tidak aktif' } };
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, studentAuthData.password);
      if (!isValidPassword) {
        return { error: { message: 'Password salah' } };
      }

      // Set auth state manually for students
      setStudentAuth(studentAuthData);
      setProfile(studentAuthData.users);
      setStudentProfile(studentAuthData.student_profiles?.[0] || null);
      setUser({ id: studentAuthData.student_id } as User);
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const studentForgotPassword = async (email: string) => {
    try {
      // Get student data with birth date
      const { data: studentData, error: studentError } = await supabase
        .from('student_auth')
        .select(`
          *,
          student_profiles (birth_date)
        `)
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (studentError || !studentData) {
        return { error: { message: 'Email tidak ditemukan' } };
      }

      // Generate new password from birth date
      const birthDate = studentData.student_profiles?.[0]?.birth_date;
      if (!birthDate) {
        return { error: { message: 'Data tanggal lahir tidak ditemukan' } };
      }

      const newPassword = generatePasswordFromBirthDate(birthDate);
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      const { error: updateError } = await supabase
        .from('student_auth')
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
      
      const { error } = await supabase
        .from('student_auth')
        .update({ 
          password: hashedPassword,
          password_reset_token: null,
          password_reset_expires: null
        })
        .eq('password_reset_token', token)
        .gt('password_reset_expires', new Date().toISOString());

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updateStudentProfile = async (data: Partial<StudentProfile & { email: string; password?: string }>) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    try {
      // Update student profile
      if (data.birth_date || data.phone || data.address) {
        const profileData: any = {};
        if (data.birth_date) profileData.birth_date = data.birth_date;
        if (data.phone !== undefined) profileData.phone = data.phone;
        if (data.address !== undefined) profileData.address = data.address;
        profileData.updated_at = new Date().toISOString();

        const { error: profileError } = await supabase
          .from('student_profiles')
          .update(profileData)
          .eq('student_id', user.id);

        if (profileError) throw profileError;
      }

      // Update auth data
      if (data.email || data.password) {
        const authData: any = {};
        if (data.email) authData.email = data.email;
        if (data.password) authData.password = await hashPassword(data.password);
        authData.updated_at = new Date().toISOString();

        const { error: authError } = await supabase
          .from('student_auth')
          .update(authData)
          .eq('student_id', user.id);

        if (authError) throw authError;
      }

      // Update user profile
      if (data.email) {
        const { error: userError } = await supabase
          .from('users')
          .update({ email: data.email, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (userError) throw userError;
      }

      // Refresh data
      if (profile?.role === 'student') {
        const studentAuthData = await fetchStudentAuth(user.id);
        setStudentAuth(studentAuthData);
        const studentProfileData = await fetchStudentProfile(user.id);
        setStudentProfile(studentProfileData);
        const userProfile = await fetchUserProfile(user.id);
        setProfile(userProfile);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };


  const signOut = async () => {
    if (profile?.role === 'teacher') {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } else {
      // Manual logout for students
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
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
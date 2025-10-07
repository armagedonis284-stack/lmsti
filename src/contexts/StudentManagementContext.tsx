/**
 * Student Management Context
 * Simplified student operations for teachers
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './SimpleAuthContext';
import { hashPassword, generatePasswordFromBirthDate } from '../utils/auth';

interface Student {
  id: string;
  student_id: string;
  email: string;
  full_name: string;
  birth_date: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface StudentManagementContextType {
  students: Student[];
  loading: boolean;
  createStudent: (data: { full_name: string; birth_date: string; phone?: string; address?: string }) => Promise<{ success: boolean; error?: string; data?: Student }>;
  updateStudent: (studentId: string, data: Partial<Student>) => Promise<{ success: boolean; error?: string }>;
  deleteStudent: (studentId: string) => Promise<{ success: boolean; error?: string }>;
  resetStudentPassword: (studentId: string) => Promise<{ success: boolean; error?: string; newPassword?: string }>;
  refreshStudents: () => Promise<void>;
}

const StudentManagementContext = createContext<StudentManagementContextType | undefined>(undefined);

export const useStudentManagement = () => {
  const context = useContext(StudentManagementContext);
  if (!context) {
    throw new Error('useStudentManagement must be used within a StudentManagementProvider');
  }
  return context;
};

export const StudentManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();

  const refreshStudents = useCallback(async () => {
    if (!user || !profile || profile.role !== 'teacher') return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const createStudent = useCallback(async (data: { full_name: string; birth_date: string; phone?: string; address?: string }) => {
    if (!user || !profile || profile.role !== 'teacher') {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      setLoading(true);

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

      // Refresh students list
      await refreshStudents();

      return { success: true, data: studentData };
    } catch (error: any) {
      console.error('Error creating student:', error);
      return { success: false, error: error.message || 'Failed to create student' };
    } finally {
      setLoading(false);
    }
  }, [user, profile, refreshStudents]);

  const updateStudent = useCallback(async (studentId: string, data: Partial<Student>) => {
    if (!user || !profile || profile.role !== 'teacher') {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      setLoading(true);

      const updateData: any = { ...data };
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', studentId)
        .eq('created_by', user.id);

      if (error) throw error;

      // Refresh students list
      await refreshStudents();

      return { success: true };
    } catch (error: any) {
      console.error('Error updating student:', error);
      return { success: false, error: error.message || 'Failed to update student' };
    } finally {
      setLoading(false);
    }
  }, [user, profile, refreshStudents]);

  const deleteStudent = useCallback(async (studentId: string) => {
    if (!user || !profile || profile.role !== 'teacher') {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('created_by', user.id);

      if (error) throw error;

      // Refresh students list
      await refreshStudents();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting student:', error);
      return { success: false, error: error.message || 'Failed to delete student' };
    } finally {
      setLoading(false);
    }
  }, [user, profile, refreshStudents]);

  const resetStudentPassword = useCallback(async (studentId: string) => {
    if (!user || !profile || profile.role !== 'teacher') {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      setLoading(true);

      // Get student data to access birth date
      const { data: studentData, error: fetchError } = await supabase
        .from('students')
        .select('birth_date, student_id, full_name')
        .eq('id', studentId)
        .eq('created_by', user.id)
        .single();

      if (fetchError || !studentData) {
        return { success: false, error: 'Student not found or access denied' };
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

      return { success: true, newPassword };
    } catch (error: any) {
      console.error('Error resetting student password:', error);
      return { success: false, error: error.message || 'Failed to reset password' };
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const value: StudentManagementContextType = {
    students,
    loading,
    createStudent,
    updateStudent,
    deleteStudent,
    resetStudentPassword,
    refreshStudents
  };

  return (
    <StudentManagementContext.Provider value={value}>
      {children}
    </StudentManagementContext.Provider>
  );
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'teacher' | 'student';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'teacher' | 'student';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'teacher' | 'student';
          updated_at?: string;
        };
      };
      student_auth: {
        Row: {
          id: string;
          email: string;
          password: string;
          student_id: string;
          is_active: boolean;
          password_reset_token: string | null;
          password_reset_expires: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password: string;
          student_id: string;
          is_active?: boolean;
          password_reset_token?: string | null;
          password_reset_expires?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password?: string;
          student_id?: string;
          is_active?: boolean;
          password_reset_token?: string | null;
          password_reset_expires?: string | null;
          updated_at?: string;
        };
      };
      student_profiles: {
        Row: {
          id: string;
          student_id: string;
          birth_date: string;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          birth_date: string;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          birth_date?: string;
          phone?: string | null;
          address?: string | null;
          updated_at?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          grade: string;
          class_name: string;
          teacher_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          grade: string;
          class_name: string;
          teacher_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          grade?: string;
          class_name?: string;
          teacher_id?: string;
          updated_at?: string;
        };
      };
      students_classes: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          class_id?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          class_id: string;
          title: string;
          description: string | null;
          type: 'mandatory' | 'additional';
          due_date: string | null;
          max_score: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          title: string;
          description?: string | null;
          type?: 'mandatory' | 'additional';
          due_date?: string | null;
          max_score?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          title?: string;
          description?: string | null;
          type?: 'mandatory' | 'additional';
          due_date?: string | null;
          max_score?: number;
          updated_at?: string;
        };
      };
    };
  };
};
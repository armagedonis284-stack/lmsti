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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          student_id: string;
          email: string;
          password: string;
          full_name: string;
          birth_date: string;
          phone: string | null;
          address: string | null;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          email: string;
          password: string;
          full_name: string;
          birth_date: string;
          phone?: string | null;
          address?: string | null;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          email?: string;
          password?: string;
          full_name?: string;
          birth_date?: string;
          phone?: string | null;
          address?: string | null;
          is_active?: boolean;
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
/*
  # Student Authentication Table

  1. New Tables
    - `student_auth` - Simple authentication for students
      - `id` (uuid, primary key)
      - `username` (text, unique) - Simple username for login
      - `password` (text) - Hashed password
      - `student_id` (uuid) - Reference to users table
      - `is_active` (boolean) - Account status
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `student_auth` table
    - Add policies for student authentication
*/

-- Student authentication table
CREATE TABLE IF NOT EXISTS student_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE student_auth ENABLE ROW LEVEL SECURITY;

-- Policies for student_auth table
CREATE POLICY "Students can read own auth data" ON student_auth
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage student auth for their classes" ON student_auth
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN students_classes sc ON u.id = sc.student_id
      JOIN classes c ON sc.class_id = c.id
      WHERE u.id = student_auth.student_id 
      AND c.teacher_id = auth.uid()
      AND u.role = 'teacher'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_student_auth_username ON student_auth(username);
CREATE INDEX IF NOT EXISTS idx_student_auth_student_id ON student_auth(student_id);
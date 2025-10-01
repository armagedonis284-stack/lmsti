/*
  # Student Email Authentication System

  1. New Tables
    - `student_profiles` - Student profile data with birth date
      - `id` (uuid, primary key)
      - `student_id` (uuid) - Reference to users table
      - `birth_date` (date) - Used for default password
      - `phone` (text) - Optional phone number
      - `address` (text) - Optional address
      - `created_at` (timestamp)

  2. Changes
    - Update student_auth table to use email instead of username
    - Add password reset functionality

  3. Security
    - Enable RLS on student_profiles table
    - Add policies for student profile management
*/

-- Student profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  birth_date date NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);

-- Update student_auth table to use email
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_auth' AND column_name = 'username'
  ) THEN
    ALTER TABLE student_auth DROP COLUMN username;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_auth' AND column_name = 'email'
  ) THEN
    ALTER TABLE student_auth ADD COLUMN email text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_auth' AND column_name = 'password_reset_token'
  ) THEN
    ALTER TABLE student_auth ADD COLUMN password_reset_token text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_auth' AND column_name = 'password_reset_expires'
  ) THEN
    ALTER TABLE student_auth ADD COLUMN password_reset_expires timestamptz;
  END IF;
END $$;

-- Make email unique in student_auth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'student_auth' AND constraint_name = 'student_auth_email_key'
  ) THEN
    ALTER TABLE student_auth ADD CONSTRAINT student_auth_email_key UNIQUE (email);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for student_profiles table
CREATE POLICY "Students can read own profile" ON student_profiles
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can update own profile" ON student_profiles
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage student profiles for their classes" ON student_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN students_classes sc ON u.id = sc.student_id
      JOIN classes c ON sc.class_id = c.id
      WHERE u.id = student_profiles.student_id 
      AND c.teacher_id = auth.uid()
      AND u.role = 'teacher'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id ON student_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_student_auth_email ON student_auth(email);
CREATE INDEX IF NOT EXISTS idx_student_auth_reset_token ON student_auth(password_reset_token);
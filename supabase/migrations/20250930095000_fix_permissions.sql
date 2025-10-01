/*
  # Fix User Permissions

  1. Update RLS policies for users table to fix permission denied errors
  2. Allow anon key to read user profiles for authentication purposes
  3. Ensure proper access control for user management
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow profile access during auth" ON users;
DROP POLICY IF EXISTS "Teachers can read student profiles" ON users;

-- Allow anon key to read user profiles for authentication
CREATE POLICY "Anon can read user profiles for auth" ON users
  FOR SELECT TO anon
  USING (true);

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Teachers can read student profiles for management
CREATE POLICY "Teachers can read student profiles" ON users
  FOR SELECT TO authenticated
  USING (
    role = 'student' AND
    EXISTS (
      SELECT 1 FROM users teacher_user
      WHERE teacher_user.id = auth.uid()
      AND teacher_user.role = 'teacher'
    )
  );

-- Fix student_auth table policies for anon access
DROP POLICY IF EXISTS "Students can read own auth data" ON student_auth;
DROP POLICY IF EXISTS "Teachers can manage student auth for their classes" ON student_auth;

-- Allow anon key to read student auth data for authentication
CREATE POLICY "Anon can read student auth for authentication" ON student_auth
  FOR SELECT TO anon
  USING (true);

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

-- Fix student_profiles table policies for anon access
DROP POLICY IF EXISTS "Students can read own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON student_profiles;
DROP POLICY IF EXISTS "Teachers can manage student profiles for their classes" ON student_profiles;

-- Allow anon key to read student profiles for authentication
CREATE POLICY "Anon can read student profiles for authentication" ON student_profiles
  FOR SELECT TO anon
  USING (true);

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
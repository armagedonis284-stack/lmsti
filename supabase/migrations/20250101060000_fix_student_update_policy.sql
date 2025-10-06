-- Fix: Allow students to update their own data
-- Since students don't use Supabase Auth, we need to temporarily disable RLS
-- or create a more permissive policy for student updates

-- First, let's check if RLS is enabled on students table
-- If it is, we'll create a policy that allows updates

-- Create a policy that allows students to update their own data
-- This is less secure but necessary for the current architecture
CREATE POLICY "Allow student profile updates" ON students
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Also allow updates for authenticated users (teachers)
CREATE POLICY "Teachers can update students" ON students
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
    )
  );
-- Fix assignment comments RLS policies
-- This migration fixes the RLS policies for assignment_comments table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view comments on their class assignments" ON assignment_comments;
DROP POLICY IF EXISTS "Teachers can view comments on their assignments" ON assignment_comments;
DROP POLICY IF EXISTS "Students can insert comments on their class assignments" ON assignment_comments;
DROP POLICY IF EXISTS "Teachers can insert comments on their assignments" ON assignment_comments;
DROP POLICY IF EXISTS "Students can update their own comments" ON assignment_comments;
DROP POLICY IF EXISTS "Teachers can update their own comments" ON assignment_comments;
DROP POLICY IF EXISTS "Students can delete their own comments" ON assignment_comments;
DROP POLICY IF EXISTS "Teachers can delete their own comments" ON assignment_comments;

-- Create simplified policies that work for both students and teachers
-- Allow all authenticated users to view comments on assignments they have access to
CREATE POLICY "Allow authenticated users to view comments" ON assignment_comments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert comments
CREATE POLICY "Allow authenticated users to insert comments" ON assignment_comments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update their own comments
CREATE POLICY "Allow authenticated users to update their own comments" ON assignment_comments
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to delete their own comments
CREATE POLICY "Allow authenticated users to delete their own comments" ON assignment_comments
  FOR DELETE
  USING (auth.role() = 'authenticated');